const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dbManager = require('./db.cjs');

app.disableHardwareAcceleration();
function createWindow() {
  dbManager.init();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#f3f4f6',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.loadURL('http://localhost:5173');
  // win.webContents.openDevTools(); // Debug uchun kerak bo'lsa yoqing
}

// --- IPC HANDLERS ---

// Zallar & Stollar
ipcMain.handle('get-halls', () => dbManager.getHalls());
ipcMain.handle('add-hall', (e, name) => dbManager.addHall(name));
ipcMain.handle('delete-hall', (e, id) => dbManager.deleteHall(id));
ipcMain.handle('get-tables', () => dbManager.getTables());
ipcMain.handle('get-tables-by-hall', (e, id) => dbManager.getTablesByHall(id));
ipcMain.handle('add-table', (e, data) => dbManager.addTable(data.hallId, data.name));
ipcMain.handle('delete-table', (e, id) => dbManager.deleteTable(id));
ipcMain.handle('update-table-status', (e, data) => dbManager.updateTableStatus(data.id, data.status));

// Checkout & Xisobot
ipcMain.handle('checkout', (e, data) => dbManager.checkout(data));
// YANGILANDI: Sanalarni qabul qilish
ipcMain.handle('get-sales', (e, range) => {
  // Agar frontenddan range kelsa ({startDate, endDate}), o'shani ishlatamiz
  if (range && range.startDate && range.endDate) {
      return dbManager.getSales(range.startDate, range.endDate);
  }
  return dbManager.getSales(); // Aks holda default
});

// Mijozlar
ipcMain.handle('get-customers', () => dbManager.getCustomers());
ipcMain.handle('add-customer', (e, c) => dbManager.addCustomer(c));
ipcMain.handle('delete-customer', (e, id) => dbManager.deleteCustomer(id));
ipcMain.handle('get-debtors', () => dbManager.getDebtors());
ipcMain.handle('get-debt-history', (e, id) => dbManager.getDebtHistory(id));
ipcMain.handle('pay-debt', (e, d) => dbManager.payDebt(d.customerId, d.amount, d.comment));

// Menyu
ipcMain.handle('get-categories', () => dbManager.getCategories());
ipcMain.handle('add-category', (e, name) => dbManager.addCategory(name));
ipcMain.handle('get-products', () => dbManager.getProducts());
ipcMain.handle('add-product', (e, p) => dbManager.addProduct(p));
ipcMain.handle('toggle-product-status', (e, d) => dbManager.toggleProductStatus(d.id, d.status));
ipcMain.handle('delete-product', (e, id) => dbManager.deleteProduct(id));

// Buyurtmalar
ipcMain.handle('get-table-items', (e, id) => dbManager.getTableItems(id));

// SOZLAMALAR
ipcMain.handle('get-settings', () => dbManager.getSettings());
ipcMain.handle('save-settings', (e, data) => dbManager.saveSettings(data));

// Oshxonalar (Kitchens)
ipcMain.handle('get-kitchens', () => dbManager.getKitchens());
ipcMain.handle('save-kitchen', (e, data) => dbManager.saveKitchen(data));
ipcMain.handle('delete-kitchen', (e, id) => dbManager.deleteKitchen(id));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });