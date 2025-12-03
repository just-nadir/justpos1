const { db, notify } = require('../database.cjs');

module.exports = {
  getUsers: () => db.prepare('SELECT * FROM users').all(),

  saveUser: (user) => {
    if (user.id) {
      // Tahrirlash
      db.prepare('UPDATE users SET name = ?, pin = ?, role = ? WHERE id = ?')
        .run(user.name, user.pin, user.role, user.id);
    } else {
      // Yangi qo'shish
      // PIN band emasligini tekshiramiz
      const exists = db.prepare('SELECT id FROM users WHERE pin = ?').get(user.pin);
      if (exists) throw new Error('Bu PIN kod band!');
      
      db.prepare('INSERT INTO users (name, pin, role) VALUES (?, ?, ?)')
        .run(user.name, user.pin, user.role);
    }
    notify('users', null);
  },

  deleteUser: (id) => {
    // Oxirgi adminni o'chirishga ruxsat bermaymiz
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
    if (user && user.role === 'admin') {
       const adminCount = db.prepare("SELECT count(*) as count FROM users WHERE role = 'admin'").get().count;
       if (adminCount <= 1) throw new Error("Oxirgi adminni o'chirib bo'lmaydi!");
    }
    
    const res = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    notify('users', null);
    return res;
  },

  // Login (PIN tekshirish)
  login: (pin) => {
    const user = db.prepare('SELECT * FROM users WHERE pin = ?').get(pin);
    if (!user) throw new Error("Noto'g'ri PIN kod");
    return user;
  }
};