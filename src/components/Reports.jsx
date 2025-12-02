import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, Calendar, TrendingUp, DollarSign, CreditCard } from 'lucide-react';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({ total: 0, count: 0, avg: 0, byMethod: {}, byProduct: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const data = await ipcRenderer.invoke('get-sales');
      setSales(data);
      calculateStats(data);
    } catch (err) { console.error(err); }
  };

  const calculateStats = (data) => {
    let total = 0;
    let byMethod = { cash: 0, card: 0, click: 0, debt: 0 };
    let productMap = {};

    data.forEach(sale => {
      total += sale.total_amount;
      const method = sale.payment_method || 'cash';
      if (byMethod[method] !== undefined) {
        byMethod[method] += sale.total_amount;
      }
      
      // Mahsulotlarni JSON dan o'qish
      try {
        const items = JSON.parse(sale.items_json || '[]');
        items.forEach(item => {
          if (!productMap[item.product_name]) productMap[item.product_name] = { qty: 0, revenue: 0 };
          productMap[item.product_name].qty += item.quantity;
          productMap[item.product_name].revenue += (item.price * item.quantity);
        });
      } catch (e) {}
    });

    // Top mahsulotlarni saralash
    const byProduct = Object.entries(productMap)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.revenue - a.revenue);

    setStats({
      total,
      count: data.length,
      avg: data.length ? total / data.length : 0,
      byMethod,
      byProduct
    });
  };

  const getPercent = (val) => stats.total ? Math.round((val / stats.total) * 100) : 0;

  return (
    <div className="flex w-full h-full bg-gray-100">
      {/* SIDEBAR */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full p-4 shadow-sm z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">Xisobotlar</h2>
        <div className="space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
             <BarChart3 size={20} /> Umumiy Ko'rsatkich
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-colors ${activeTab === 'products' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
             <PieChart size={20} /> Mahsulotlar (Top)
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
             {/* CARDS */}
             <div className="grid grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl w-fit mb-4"><DollarSign size={24}/></div>
                  <p className="text-gray-400 text-sm">Jami Savdo</p>
                  <h3 className="text-3xl font-bold text-gray-800">{stats.total.toLocaleString()}</h3>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-4"><CreditCard size={24}/></div>
                  <p className="text-gray-400 text-sm">Cheklar Soni</p>
                  <h3 className="text-3xl font-bold text-gray-800">{stats.count}</h3>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-xl w-fit mb-4"><TrendingUp size={24}/></div>
                  <p className="text-gray-400 text-sm">O'rtacha Chek</p>
                  <h3 className="text-3xl font-bold text-gray-800">{Math.round(stats.avg).toLocaleString()}</h3>
               </div>
             </div>

             {/* TO'LOV TURLARI */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-6">To'lov Turlari</h3>
                <div className="space-y-4">
                  {[
                    { key: 'cash', label: 'Naqd Pul', color: 'bg-green-500' },
                    { key: 'card', label: 'Karta (Terminal)', color: 'bg-blue-500' },
                    { key: 'click', label: 'Click / Payme', color: 'bg-cyan-500' },
                    { key: 'debt', label: 'Nasiya (Qarz)', color: 'bg-red-500' }
                  ].map(type => (
                    <div key={type.key}>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span className="capitalize">{type.label}</span>
                        <span>{stats.byMethod[type.key]?.toLocaleString() || 0} so'm</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className={`h-full ${type.color}`} style={{ width: `${getPercent(stats.byMethod[type.key])}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-lg mb-6">Top Sotilgan Mahsulotlar</h3>
             <table className="w-full text-left">
               <thead>
                 <tr className="text-gray-400 text-sm border-b border-gray-100">
                   <th className="pb-3 font-medium">Nomi</th>
                   <th className="pb-3 font-medium">Soni</th>
                   <th className="pb-3 font-medium text-right">Jami Summa</th>
                 </tr>
               </thead>
               <tbody>
                 {stats.byProduct.map((prod, i) => (
                   <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                     <td className="py-4 font-bold text-gray-700">{prod.name}</td>
                     <td className="py-4 text-gray-500">{prod.qty} ta</td>
                     <td className="py-4 text-right font-bold text-blue-600">{prod.revenue.toLocaleString()}</td>
                   </tr>
                 ))}
                 {stats.byProduct.length === 0 && <tr><td colSpan="3" className="py-8 text-center text-gray-400">Ma'lumot yo'q</td></tr>}
               </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;