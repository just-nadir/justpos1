const express = require('express');
const cors = require('cors');
const dbManager = require('./db.cjs');
const ip = require('ip');

function startServer() {
  const app = express();
  const PORT = 3000; 

  app.use(cors());
  app.use(express.json());

  // 1. Zallar va Stollar
  app.get('/api/halls', (req, res) => {
    try {
      const halls = dbManager.getHalls();
      res.json(halls);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/tables', (req, res) => {
    try {
      const tables = dbManager.getTables();
      res.json(tables);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // 2. Menyu
  app.get('/api/categories', (req, res) => {
    try {
      const categories = dbManager.getCategories();
      res.json(categories);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/products', (req, res) => {
    try {
      const products = dbManager.getProducts().filter(p => p.is_active === 1);
      res.json(products);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // 3. Stol buyurtmalari
  app.get('/api/tables/:id/items', (req, res) => {
    try {
      const items = dbManager.getTableItems(req.params.id);
      res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // 4. BUYURTMA QO'SHISH
  app.post('/api/orders/add', (req, res) => {
    try {
      dbManager.addItem(req.body);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // --- YANGI ENDPOINTLAR ---

  // 5. SOZLAMALARNI OLISH (Fixed yoki Percent ekanligini bilish uchun)
  app.get('/api/settings', (req, res) => {
    try {
      const settings = dbManager.getSettings();
      res.json(settings);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // 6. MEHMONLAR SONINI YANGILASH
  app.post('/api/tables/guests', (req, res) => {
    try {
      const { tableId, count } = req.body;
      dbManager.updateTableGuests(tableId, count);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.listen(PORT, '0.0.0.0', () => {
    const localIp = ip.address();
    console.log(`============================================`);
    console.log(`📡 MOBIL SERVER ISHLADI: http://${localIp}:${PORT}`);
    console.log(`============================================`);
  });
}

module.exports = startServer;