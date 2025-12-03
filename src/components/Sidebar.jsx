import React from 'react';
import { LayoutGrid, UtensilsCrossed, Settings, LogOut, Square, Users, FileText, PieChart } from 'lucide-react';

const Sidebar = ({ activePage, onNavigate, onLogout, user }) => {
  const menuItems = [
    { id: 'pos', icon: <LayoutGrid size={24} />, label: "Kassa" },
    { id: 'menu', icon: <UtensilsCrossed size={24} />, label: "Menyu" },
    { id: 'tables', icon: <Square size={24} />, label: "Zallar" },
    { id: 'customers', icon: <Users size={24} />, label: "Mijozlar" },
    { id: 'debtors', icon: <FileText size={24} />, label: "Qarzdorlar" },
    { id: 'reports', icon: <PieChart size={24} />, label: "Xisobotlar" },
    { id: 'settings', icon: <Settings size={24} />, label: "Sozlamalar" },
  ];

  // Agar user oddiy ofitsiant bo'lsa, Sozlamalar va Hisobotlarni yashirish mumkin
  // Hozircha hammasi ochiq qolaversin

  return (
    <div className="w-24 bg-white h-screen flex flex-col items-center py-4 shadow-lg z-10">
      {/* Logo / User Initials */}
      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-8" title={user?.name}>
        {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
      </div>

      {/* Menu Items */}
      <div className="flex-1 flex flex-col gap-4 w-full px-2">
        {menuItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 group
              ${activePage === item.id 
                ? 'bg-blue-50 text-blue-600 shadow-sm' 
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
          >
            <div className="mb-1">{item.icon}</div>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom Actions (LOGOUT) */}
      <div className="flex flex-col gap-4 w-full px-2 mb-4">
        <button 
          onClick={onLogout} 
          className="flex flex-col items-center justify-center p-3 text-red-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
          title="Chiqish"
        >
          <LogOut size={24} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;