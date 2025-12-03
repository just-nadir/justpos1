import React, { useState, useEffect } from 'react';
import { Save, Printer, Database, Store, Receipt, Percent, RefreshCw, ChefHat, Plus, Trash2 } from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [kitchens, setKitchens] = useState([]);
  
  const [newKitchen, setNewKitchen] = useState({ name: '', printer_ip: '192.168.1.', printer_port: 9100 });

  const [settings, setSettings] = useState({
    restaurantName: "", address: "", phone: "", wifiPassword: "",
    serviceChargeType: "percent", serviceChargeValue: 0, receiptFooter: "", 
    // YANGI: Kassa printeri uchun IP va Port
    printerReceiptIP: "", 
    printerReceiptPort: 9100
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
     if (!window.require) return;
     try {
        const { ipcRenderer } = window.require('electron');
        const sData = await ipcRenderer.invoke('get-settings');
        setSettings(prev => ({
            ...prev, 
            ...sData, 
            serviceChargeValue: Number(sData.serviceChargeValue) || 0,
            // Portni raqamga o'tkazamiz
            printerReceiptPort: Number(sData.printerReceiptPort) || 9100 
        }));
        
        const kData = await ipcRenderer.invoke('get-kitchens');
        setKitchens(kData);
     } catch (err) { console.error(err); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('save-settings', settings);
        alert("Sozlamalar saqlandi!");
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // --- KITCHEN ACTIONS ---
  const handleSaveKitchen = async (e) => {
    e.preventDefault();
    if(!newKitchen.name) return;
    try {
       const { ipcRenderer } = window.require('electron');
       await ipcRenderer.invoke('save-kitchen', newKitchen);
       setNewKitchen({ name: '', printer_ip: '192.168.1.', printer_port: 9100 }); 
       loadAllData(); 
    } catch (err) { console.error(err); }
  };

  const handleDeleteKitchen = async (id) => {
     if(window.confirm("Oshxonani o'chirmoqchimisiz?")) {
        try {
           const { ipcRenderer } = window.require('electron');
           await ipcRenderer.invoke('delete-kitchen', id);
           loadAllData();
        } catch(err) { console.error(err); }
     }
  };

  const handleBackup = async () => {
    if(window.confirm("Ma'lumotlar bazasidan nusxa olinsinmi?")) {
        alert("Backup funksiyasi tez orada qo'shiladi.");
    }
  };

  return (
    <div className="flex w-full h-full bg-gray-100">
      {/* SIDEBAR */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full p-4 shadow-sm z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">Sozlamalar</h2>
        <div className="space-y-2">
          <button onClick={() => setActiveTab('general')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'general' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Store size={20} /> Umumiy Ma'lumot</button>
          <button onClick={() => setActiveTab('order')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'order' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Percent size={20} /> Buyurtma va Xizmat</button>
          <button onClick={() => setActiveTab('kitchens')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'kitchens' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><ChefHat size={20} /> Oshxonalar & LAN</button>
          <button onClick={() => setActiveTab('printers')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'printers' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Printer size={20} /> Kassa Printeri</button>
          <button onClick={() => setActiveTab('database')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'database' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Database size={20} /> Baza va Tizim</button>
        </div>
        <div className="mt-auto">
          <button onClick={handleSaveSettings} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70">
             {loading ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />} Saqlash
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* GENERAL */}
        {activeTab === 'general' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Store size={20} className="text-blue-500"/> Restoran Ma'lumotlari</h3>
              <div className="grid gap-4">
                <div><label className="block text-sm font-bold text-gray-500 mb-1">Restoran Nomi</label><input type="text" name="restaurantName" value={settings.restaurantName || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-bold text-gray-700" /></div>
                <div><label className="block text-sm font-bold text-gray-500 mb-1">Manzil</label><input type="text" name="address" value={settings.address || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" /></div>
                <div><label className="block text-sm font-bold text-gray-500 mb-1">Telefon</label><input type="text" name="phone" value={settings.phone || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500" /></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Receipt size={20} className="text-orange-500"/> Chek Sozlamalari</h3>
               <div><label className="block text-sm font-bold text-gray-500 mb-1">Chekosti yozuvi</label><textarea rows="3" name="receiptFooter" value={settings.receiptFooter || ''} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 resize-none"></textarea></div>
            </div>
          </div>
        )}

        {/* ORDER */}
        {activeTab === 'order' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Percent size={20} className="text-green-500"/> Xizmat Haqi (Service Charge)</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                 <button onClick={() => setSettings({...settings, serviceChargeType: 'percent'})} className={`p-4 rounded-xl border-2 font-bold transition-all ${settings.serviceChargeType === 'percent' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50'}`}>Foiz (%) da</button>
                 <button onClick={() => setSettings({...settings, serviceChargeType: 'fixed'})} className={`p-4 rounded-xl border-2 font-bold transition-all ${settings.serviceChargeType === 'fixed' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50'}`}>Kishi boshiga (Fixed)</button>
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1">{settings.serviceChargeType === 'percent' ? 'Xizmat foizi' : 'Kishi boshiga summa'}</label>
                  <div className="relative">
                    <input type="number" name="serviceChargeValue" value={settings.serviceChargeValue || 0} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-bold text-xl" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{settings.serviceChargeType === 'percent' ? '%' : "so'm"}</div>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* KITCHENS & LAN PRINTERS */}
        {activeTab === 'kitchens' && (
          <div className="max-w-3xl space-y-6">
             {/* Add New */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus size={20} className="text-blue-500"/> Yangi Oshxona Qo'shish</h3>
                <form onSubmit={handleSaveKitchen} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-4">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nomi</label>
                        <input required type="text" value={newKitchen.name} onChange={e => setNewKitchen({...newKitchen, name: e.target.value})} placeholder="Masalan: Bar" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-bold" />
                    </div>
                    <div className="col-span-5">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">LAN Printer IP</label>
                        <input type="text" value={newKitchen.printer_ip} onChange={e => setNewKitchen({...newKitchen, printer_ip: e.target.value})} placeholder="192.168.1.200" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-mono" />
                    </div>
                    <div className="col-span-3">
                        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">Saqlash</button>
                    </div>
                </form>
             </div>

             {/* List */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><ChefHat size={20} className="text-orange-500"/> Oshxonalar Ro'yxati</h3>
                <div className="space-y-3">
                   {kitchens.map(k => (
                       <div key={k.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 group">
                          <div>
                             <p className="font-bold text-gray-800 text-lg">{k.name}</p>
                             <p className="text-xs text-gray-500 font-mono flex items-center gap-2">
                                <Printer size={12} /> {k.printer_ip ? `IP: ${k.printer_ip}:${k.printer_port}` : "Printer ulanmagan"}
                             </p>
                          </div>
                          <button onClick={() => handleDeleteKitchen(k.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={20}/></button>
                       </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* PRINTERS (Receipt) - YANGILANDI */}
        {activeTab === 'printers' && (
          <div className="max-w-2xl space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Printer size={20} className="text-purple-500"/> Kassa Printeri</h3>
                <p className="text-sm text-gray-400 mb-6">Mijozga beriladigan chek uchun asosiy printer (LAN).</p>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                        <p className="font-bold text-gray-700">Printer IP Manzili</p>
                        <p className="text-xs text-gray-400">Masalan: 192.168.1.100</p>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            name="printerReceiptIP" 
                            value={settings.printerReceiptIP || ''} 
                            onChange={handleChange} 
                            className="p-2 rounded-lg border border-gray-300 outline-none text-sm w-32 font-mono text-center" 
                            placeholder="192.168.1.100" 
                        />
                        <input 
                            type="number" 
                            name="printerReceiptPort" 
                            value={settings.printerReceiptPort || 9100} 
                            onChange={handleChange} 
                            className="p-2 rounded-lg border border-gray-300 outline-none text-sm w-20 font-mono text-center" 
                            placeholder="9100" 
                        />
                    </div>
                </div>
             </div>
          </div>
        )}

        {/* DATABASE */}
        {activeTab === 'database' && (
          <div className="max-w-2xl space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><Database size={20} className="text-red-500"/> Ma'lumotlar Bazasi</h3>
                <p className="text-sm text-gray-500 mb-6">Ehtiyot bo'ling! Ma'lumotlarni yo'qotmaslik uchun tez-tez nusxa olib turing.</p>
                <div className="flex gap-4">
                   <button onClick={handleBackup} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"><Save size={18} /> Backup (Nusxa olish)</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;