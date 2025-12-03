const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getAppPath(), 'pos.db');
const db = new Database(dbPath, { verbose: console.log });

function initDB() {
  // ... (Eski jadvallar: halls, tables, customers, debt_history, categories... bular turibdi)
  db.exec(`CREATE TABLE IF NOT EXISTS halls (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);
  db.exec(`CREATE TABLE IF NOT EXISTS tables (id INTEGER PRIMARY KEY AUTOINCREMENT, hall_id INTEGER, name TEXT NOT NULL, status TEXT DEFAULT 'free', guests INTEGER DEFAULT 0, start_time TEXT, total_amount REAL DEFAULT 0, FOREIGN KEY(hall_id) REFERENCES halls(id) ON DELETE CASCADE)`);
  db.exec(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, type TEXT DEFAULT 'standard', value INTEGER DEFAULT 0, balance REAL DEFAULT 0, birthday TEXT, debt REAL DEFAULT 0)`);
  db.exec(`CREATE TABLE IF NOT EXISTS debt_history (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, amount REAL, type TEXT, date TEXT, comment TEXT, FOREIGN KEY(customer_id) REFERENCES customers(id))`);
  db.exec(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);
  // PRODUCTS
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      destination TEXT, 
      is_active INTEGER DEFAULT 1,
      image TEXT,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    )
  `);
  
  db.exec(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, table_id INTEGER, product_name TEXT, price REAL, quantity INTEGER, destination TEXT, FOREIGN KEY(table_id) REFERENCES tables(id))`);
  db.exec(`CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, total_amount REAL, subtotal REAL, discount REAL, payment_method TEXT, customer_id INTEGER, items_json TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  // OSHXONALAR
  db.exec(`
    CREATE TABLE IF NOT EXISTS kitchens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      printer_ip TEXT,       
      printer_port INTEGER DEFAULT 9100
    )
  `);
  // DEFAULT DATA
  const stmtK = db.prepare('SELECT count(*) as count FROM kitchens');
  if (stmtK.get().count === 0) {
     const insertK = db.prepare('INSERT INTO kitchens (name, printer_ip) VALUES (?, ?)');
     insertK.run('Oshxona', '192.168.1.200');
     insertK.run('Bar', '192.168.1.201');
     insertK.run('Mangal', '192.168.1.202');
  }
  
  const stmtHalls = db.prepare('SELECT count(*) as count FROM halls');
  if (stmtHalls.get().count === 0) {
    const hall1 = db.prepare("INSERT INTO halls (name) VALUES ('Asosiy Zal')").run().lastInsertRowid;
    db.prepare("INSERT INTO tables (hall_id, name) VALUES (?, 'Stol 1')").run(hall1);
    db.prepare("INSERT INTO categories (name) VALUES ('Taomlar')").run();
    db.prepare("INSERT INTO products (category_id, name, price, destination) VALUES (1, 'Osh', 65000, '1')").run();
  }
}

const dbManager = {
  init: initDB,
  
  getHalls: () => db.prepare('SELECT * FROM halls').all(),
  getTables: () => db.prepare('SELECT * FROM tables').all(),
  getTablesByHall: (id) => db.prepare('SELECT * FROM tables WHERE hall_id = ?').all(id),
  getCustomers: () => db.prepare('SELECT * FROM customers').all(),
  getCategories: () => db.prepare('SELECT * FROM categories').all(),
  
  getProducts: () => db.prepare(`
    SELECT p.*, c.name as category_name, k.name as kitchen_name 
    FROM products p 
    LEFT JOIN categories c 
    ON p.category_id = c.id 
    LEFT JOIN kitchens k ON p.destination = CAST(k.id AS TEXT)
  `).all(),

  getTableItems: (id) => db.prepare('SELECT * FROM order_items WHERE table_id = ?').all(id),
  getDebtors: () => db.prepare('SELECT * FROM customers WHERE debt > 0').all(),
  getDebtHistory: (id) => db.prepare('SELECT * FROM debt_history WHERE customer_id = ? ORDER BY id DESC').all(id),
  
  getSales: (startDate, endDate) => {
    if (!startDate || !endDate) return db.prepare('SELECT * FROM sales ORDER BY date DESC LIMIT 100').all();
    return db.prepare('SELECT * FROM sales WHERE date >= ? AND date <= ? ORDER BY date DESC').all(startDate, endDate);
  },

  getSettings: () => {
    const rows = db.prepare('SELECT * FROM settings').all();
    return rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
  },

  getKitchens: () => db.prepare('SELECT * FROM kitchens').all(),
  
  saveKitchen: (data) => {
    if (data.id) {
        return db.prepare('UPDATE kitchens SET name = ?, printer_ip = ?, printer_port = ? WHERE id = ?')
                 .run(data.name, data.printer_ip, data.printer_port || 9100, data.id);
    } else {
        return db.prepare('INSERT INTO kitchens (name, printer_ip, printer_port) VALUES (?, ?, ?)')
                 .run(data.name, data.printer_ip, data.printer_port || 9100);
    }
  },
  
  deleteKitchen: (id) => {
      db.prepare("UPDATE products SET destination = NULL WHERE destination = ?").run(String(id));
      return db.prepare('DELETE FROM kitchens WHERE id = ?').run(id);
  },

  saveSettings: (settingsObj) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const saveTransaction = db.transaction((settings) => {
      for (const [key, value] of Object.entries(settings)) stmt.run(key, String(value));
    });
    return saveTransaction(settingsObj);
  },

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
  
  addProduct: (p) => db.prepare('INSERT INTO products (category_id, name, price, destination, is_active) VALUES (?, ?, ?, ?, ?)').run(p.category_id, p.name, p.price, String(p.destination), 1),
  
  toggleProductStatus: (id, status) => db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(status, id),
  deleteProduct: (id) => db.prepare('DELETE FROM products WHERE id = ?').run(id),

  addItem: (data) => {
    const addItemTransaction = db.transaction((item) => {
       const { tableId, productId, productName, price, quantity, destination } = item;
       db.prepare(`INSERT INTO order_items (table_id, product_name, price, quantity, destination) VALUES (?, ?, ?, ?, ?)`).run(tableId, productName, price, quantity, destination);
       const currentTable = db.prepare('SELECT total_amount FROM tables WHERE id = ?').get(tableId);
       const newTotal = (currentTable ? currentTable.total_amount : 0) + (price * quantity);
       db.prepare(`UPDATE tables SET status = 'occupied', total_amount = ?, start_time = COALESCE(start_time, ?) WHERE id = ?`)
         .run(newTotal, new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), tableId);
    });
    return addItemTransaction(data);
  },

  // --- YANGI: MEHMONLAR SONINI YANGILASH ---
  updateTableGuests: (id, count) => {
    return db.prepare("UPDATE tables SET guests = ?, status = 'occupied', start_time = COALESCE(start_time, ?) WHERE id = ?")
             .run(count, new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), id);
  },

  updateTableStatus: (id, status) => db.prepare('UPDATE tables SET status = ? WHERE id = ?').run(status, id),
  
  closeTable: (id) => {
    db.prepare('DELETE FROM order_items WHERE table_id = ?').run(id);
    return db.prepare(`UPDATE tables SET status = 'free', guests = 0, start_time = NULL, total_amount = 0 WHERE id = ?`).run(id);
  },

  payDebt: (customerId, amount, comment) => {
    const date = new Date().toISOString();
    const updateDebt = db.transaction(() => {
      db.prepare('UPDATE customers SET debt = debt - ? WHERE id = ?').run(amount, customerId);
      db.prepare('INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)').run(customerId, amount, 'payment', date, comment);
    });
    return updateDebt();
  },

  checkout: (data) => {
    const { tableId, total, subtotal, discount, paymentMethod, customerId, items } = data;
    const date = new Date().toISOString();
    const performCheckout = db.transaction(() => {
      db.prepare(`INSERT INTO sales (date, total_amount, subtotal, discount, payment_method, customer_id, items_json) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(date, total, subtotal, discount, paymentMethod, customerId, JSON.stringify(items));
      if (paymentMethod === 'debt' && customerId) {
        db.prepare('UPDATE customers SET debt = debt + ? WHERE id = ?').run(total, customerId);
        db.prepare('INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)').run(customerId, total, 'debt', date, 'Savdo (Nasiya)');
      }
      db.prepare('DELETE FROM order_items WHERE table_id = ?').run(tableId);
      db.prepare("UPDATE tables SET status = 'free', guests = 0, start_time = NULL, total_amount = 0 WHERE id = ?").run(tableId);
    });
    return performCheckout();
  }
};

module.exports = dbManager;