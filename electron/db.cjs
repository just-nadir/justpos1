const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getAppPath(), 'pos.db');
const db = new Database(dbPath, { verbose: console.log });

function initDB() {
  // 1. HALLS
  db.exec(`CREATE TABLE IF NOT EXISTS halls (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);

  // 2. TABLES
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

  // 3. CUSTOMERS (YANGILANDI: debt qo'shildi)
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      type TEXT DEFAULT 'standard',
      value INTEGER DEFAULT 0,
      balance REAL DEFAULT 0,
      birthday TEXT,
      debt REAL DEFAULT 0  -- Qarz summasi
    )
  `);

  // 4. DEBT HISTORY (YANGI: Qarz tarixi)
  db.exec(`
    CREATE TABLE IF NOT EXISTS debt_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      amount REAL,         -- Summa
      type TEXT,           -- 'debt' (qarz oldi) yoki 'payment' (to'ladi)
      date TEXT,           -- Sana
      comment TEXT,        -- Izoh (masalan: "Osh uchun" yoki "Naqd to'ladi")
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
  `);

  // 5. CATEGORIES
  db.exec(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);

  // 6. PRODUCTS
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

  // 7. ORDER ITEMS
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

  // --- DUMMY DATA ---
  const stmtHalls = db.prepare('SELECT count(*) as count FROM halls');
  if (stmtHalls.get().count === 0) {
    const insertHall = db.prepare('INSERT INTO halls (name) VALUES (?)');
    const hall1 = insertHall.run('Asosiy Zal').lastInsertRowid;
    db.prepare('INSERT INTO tables (hall_id, name) VALUES (?, ?)').run(hall1, 'Stol 1');
    db.prepare("INSERT INTO categories (name) VALUES ('Taomlar')").run();
    db.prepare("INSERT INTO products (category_id, name, price, destination) VALUES (1, 'Osh', 65000, 'kitchen')").run();

    // Mijozlar
    const insertCustomer = db.prepare('INSERT INTO customers (name, phone, type, value, balance, birthday, debt) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertCustomer.run('Sardor Rahimov', '99 888 77 66', 'discount', 15, 0, '1995-05-20', 0);
    insertCustomer.run('Ali Valiyev', '90 123 45 67', 'cashback', 5, 45000, null, 0);
    // Bitta qarzdor mijoz (Test uchun)
    insertCustomer.run('Botir Aka (Qarzdor)', '91 111 22 33', 'standard', 0, 0, null, 150000);
    
    // Qarz tarixi (Test uchun)
    const botirId = 3; 
    db.prepare("INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)").run(botirId, 150000, 'debt', new Date().toISOString(), 'Eski qarz');
  }
}

const dbManager = {
  init: initDB,
  
  // Getters
  getHalls: () => db.prepare('SELECT * FROM halls').all(),
  getTables: () => db.prepare('SELECT * FROM tables').all(),
  getTablesByHall: (hallId) => db.prepare('SELECT * FROM tables WHERE hall_id = ?').all(hallId),
  getCustomers: () => db.prepare('SELECT * FROM customers').all(),
  getCategories: () => db.prepare('SELECT * FROM categories').all(),
  getProducts: () => db.prepare('SELECT products.*, categories.name as category_name FROM products LEFT JOIN categories ON products.category_id = categories.id').all(),
  getTableItems: (tableId) => db.prepare('SELECT * FROM order_items WHERE table_id = ?').all(tableId),
  
  // YANGI: Qarzdorlar uchun funksiyalar
  getDebtors: () => db.prepare('SELECT * FROM customers WHERE debt > 0').all(),
  getDebtHistory: (customerId) => db.prepare('SELECT * FROM debt_history WHERE customer_id = ? ORDER BY id DESC').all(customerId),

  // Actions
  addHall: (name) => db.prepare('INSERT INTO halls (name) VALUES (?)').run(name),
  deleteHall: (id) => {
    db.prepare('DELETE FROM tables WHERE hall_id = ?').run(id);
    return db.prepare('DELETE FROM halls WHERE id = ?').run(id);
  },
  addTable: (hallId, name) => db.prepare('INSERT INTO tables (hall_id, name) VALUES (?, ?)').run(hallId, name),
  deleteTable: (id) => db.prepare('DELETE FROM tables WHERE id = ?').run(id),
  
  addCustomer: (customer) => {
    const stmt = db.prepare('INSERT INTO customers (name, phone, type, value, balance, birthday, debt) VALUES (?, ?, ?, ?, ?, ?, 0)');
    return stmt.run(customer.name, customer.phone, customer.type, customer.value || 0, 0, customer.birthday || null);
  },
  deleteCustomer: (id) => db.prepare('DELETE FROM customers WHERE id = ?').run(id),

  // QARZ YOZISH (Tranzaksiya: Qarzni oshirish + Tarixga yozish)
  addDebt: (customerId, amount, comment) => {
    const date = new Date().toISOString();
    // 1. Mijoz qarzini oshirish
    db.prepare('UPDATE customers SET debt = debt + ? WHERE id = ?').run(amount, customerId);
    // 2. Tarixga yozish
    return db.prepare('INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)').run(customerId, amount, 'debt', date, comment);
  },

  // QARZ TO'LASH (Tranzaksiya: Qarzni kamaytirish + Tarixga yozish)
  payDebt: (customerId, amount, comment) => {
    const date = new Date().toISOString();
    // 1. Mijoz qarzini kamaytirish
    db.prepare('UPDATE customers SET debt = debt - ? WHERE id = ?').run(amount, customerId);
    // 2. Tarixga yozish
    return db.prepare('INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)').run(customerId, amount, 'payment', date, comment);
  },

  addCategory: (name) => db.prepare('INSERT INTO categories (name) VALUES (?)').run(name),
  addProduct: (product) => {
    const stmt = db.prepare('INSERT INTO products (category_id, name, price, destination, is_active) VALUES (?, ?, ?, ?, ?)');
    return stmt.run(product.category_id, product.name, product.price, product.destination, 1);
  },
  toggleProductStatus: (id, status) => db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(status, id),
  deleteProduct: (id) => db.prepare('DELETE FROM products WHERE id = ?').run(id),

  updateTableStatus: (id, status) => db.prepare('UPDATE tables SET status = ? WHERE id = ?').run(status, id),
  closeTable: (id) => {
    db.prepare('DELETE FROM order_items WHERE table_id = ?').run(id);
    return db.prepare(`UPDATE tables SET status = 'free', guests = 0, start_time = NULL, total_amount = 0 WHERE id = ?`).run(id);
  }
};

module.exports = dbManager;