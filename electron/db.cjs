const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getAppPath(), 'pos.db');
const db = new Database(dbPath, { verbose: console.log });

function initDB() {
  // 1. Jadvallar (Avvalgilari o'zgarishsiz qoladi)
  db.exec(`CREATE TABLE IF NOT EXISTS halls (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hall_id INTEGER,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'free',
      guests INTEGER DEFAULT 0,
      start_time TEXT,
      total_amount REAL DEFAULT 0,
      FOREIGN KEY(hall_id) REFERENCES halls(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      type TEXT DEFAULT 'standard',
      value INTEGER DEFAULT 0,
      balance REAL DEFAULT 0,
      birthday TEXT,
      debt REAL DEFAULT 0
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS debt_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      amount REAL,
      type TEXT,
      date TEXT,
      comment TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
  `);

  db.exec(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      destination TEXT DEFAULT 'kitchen',
      is_active INTEGER DEFAULT 1,
      image TEXT,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER,
      product_name TEXT,
      price REAL,
      quantity INTEGER,
      destination TEXT,
      FOREIGN KEY(table_id) REFERENCES tables(id)
    )
  `);

  // --- YANGI JADVAL: SAVDOLAR TARIXI (Xisobot uchun) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,              -- Sotilgan vaqt
      total_amount REAL,      -- Jami summa (chegirmadan keyin)
      subtotal REAL,          -- Chegirmasiz summa
      discount REAL,          -- Chegirma summasi
      payment_method TEXT,    -- 'cash', 'card', 'click', 'debt'
      customer_id INTEGER,    -- Agar mijoz tanlangan bo'lsa
      items_json TEXT         -- Sotilgan tovarlar ro'yxati (JSON formatda)
    )
  `);

  // --- DUMMY DATA ---
  const stmtHalls = db.prepare('SELECT count(*) as count FROM halls');
  if (stmtHalls.get().count === 0) {
    const hall1 = db.prepare("INSERT INTO halls (name) VALUES ('Asosiy Zal')").run().lastInsertRowid;
    db.prepare("INSERT INTO tables (hall_id, name) VALUES (?, 'Stol 1')").run(hall1);
    db.prepare("INSERT INTO categories (name) VALUES ('Taomlar')").run();
    db.prepare("INSERT INTO products (category_id, name, price) VALUES (1, 'Osh', 65000)").run();
  }
}

const dbManager = {
  init: initDB,
  
  // Getters
  getHalls: () => db.prepare('SELECT * FROM halls').all(),
  getTables: () => db.prepare('SELECT * FROM tables').all(),
  getTablesByHall: (id) => db.prepare('SELECT * FROM tables WHERE hall_id = ?').all(id),
  getCustomers: () => db.prepare('SELECT * FROM customers').all(),
  getCategories: () => db.prepare('SELECT * FROM categories').all(),
  getProducts: () => db.prepare('SELECT products.*, categories.name as category_name FROM products LEFT JOIN categories ON products.category_id = categories.id').all(),
  getTableItems: (id) => db.prepare('SELECT * FROM order_items WHERE table_id = ?').all(id),
  getDebtors: () => db.prepare('SELECT * FROM customers WHERE debt > 0').all(),
  getDebtHistory: (id) => db.prepare('SELECT * FROM debt_history WHERE customer_id = ? ORDER BY id DESC').all(id),

  // YANGI: Xisobot uchun savdolarni olish
  getSales: (limit = 100) => db.prepare('SELECT * FROM sales ORDER BY id DESC LIMIT ?').all(limit),

  // Actions
  addHall: (name) => db.prepare('INSERT INTO halls (name) VALUES (?)').run(name),
  deleteHall: (id) => {
    db.prepare('DELETE FROM tables WHERE hall_id = ?').run(id);
    return db.prepare('DELETE FROM halls WHERE id = ?').run(id);
  },
  addTable: (hallId, name) => db.prepare('INSERT INTO tables (hall_id, name) VALUES (?, ?)').run(hallId, name),
  deleteTable: (id) => db.prepare('DELETE FROM tables WHERE id = ?').run(id),
  addCustomer: (c) => db.prepare('INSERT INTO customers (name, phone, type, value, balance, birthday, debt) VALUES (?, ?, ?, ?, ?, ?, 0)').run(c.name, c.phone, c.type, c.value, 0, c.birthday),
  deleteCustomer: (id) => db.prepare('DELETE FROM customers WHERE id = ?').run(id),
  
  addCategory: (name) => db.prepare('INSERT INTO categories (name) VALUES (?)').run(name),
  addProduct: (p) => db.prepare('INSERT INTO products (category_id, name, price, destination, is_active) VALUES (?, ?, ?, ?, ?)').run(p.category_id, p.name, p.price, p.destination, 1),
  toggleProductStatus: (id, status) => db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(status, id),
  deleteProduct: (id) => db.prepare('DELETE FROM products WHERE id = ?').run(id),

  updateTableStatus: (id, status) => db.prepare('UPDATE tables SET status = ? WHERE id = ?').run(status, id),

  // Qarz to'lash
  payDebt: (customerId, amount, comment) => {
    const date = new Date().toISOString();
    const updateDebt = db.transaction(() => {
      db.prepare('UPDATE customers SET debt = debt - ? WHERE id = ?').run(amount, customerId);
      db.prepare('INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)').run(customerId, amount, 'payment', date, comment);
    });
    return updateDebt();
  },

  // --- MUKAMMAL CHECKOUT (TRANZAKSIYA) ---
  checkout: (data) => {
    const { tableId, total, subtotal, discount, paymentMethod, customerId, items } = data;
    const date = new Date().toISOString();

    // Tranzaksiya: Bitta xato bo'lsa, hammasini bekor qiladi
    const performCheckout = db.transaction(() => {
      // 1. Savdoni arxivga yozish
      db.prepare(`
        INSERT INTO sales (date, total_amount, subtotal, discount, payment_method, customer_id, items_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(date, total, subtotal, discount, paymentMethod, customerId, JSON.stringify(items));

      // 2. Agar Nasiya bo'lsa, mijoz qarzini oshirish
      if (paymentMethod === 'debt' && customerId) {
        db.prepare('UPDATE customers SET debt = debt + ? WHERE id = ?').run(total, customerId);
        db.prepare('INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)').run(customerId, total, 'debt', date, 'Savdo (Nasiya)');
      }

      // 3. Stolni tozalash va bo'shatish
      db.prepare('DELETE FROM order_items WHERE table_id = ?').run(tableId);
      db.prepare("UPDATE tables SET status = 'free', guests = 0, start_time = NULL, total_amount = 0 WHERE id = ?").run(tableId);
    });

    return performCheckout();
  }
};

module.exports = dbManager;