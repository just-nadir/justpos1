import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TablesGrid from './TablesGrid';
import OrderSummary from './OrderSummary';
import MenuManagement from './MenuManagement';
import TablesManagement from './TablesManagement';
import CustomersManagement from './CustomersManagement';
import DebtorsManagement from './DebtorsManagement';
import Reports from './Reports';
import Settings from './Settings';
import PinLogin from './PinLogin'; // Yangi import

const DesktopLayout = () => {
  const [user, setUser] = useState(null); // Tizimga kirgan foydalanuvchi
  const [activePage, setActivePage] = useState('pos');
  const [selectedTable, setSelectedTable] = useState(null);

  // Agar user bo'lmasa -> LOGIN EKRANI
  if (!user) {
    return <PinLogin onLogin={(loggedInUser) => setUser(loggedInUser)} />;
  }

  const handleLogout = () => {
    setUser(null);
    setSelectedTable(null);
    setActivePage('pos');
  };

  const renderContent = () => {
    switch (activePage) {
      case 'pos':
        return (
          <>
            <TablesGrid onSelectTable={setSelectedTable} />
            <OrderSummary table={selectedTable} onDeselect={() => setSelectedTable(null)} />
          </>
        );
      case 'menu': return <MenuManagement />;
      case 'tables': return <TablesManagement />;
      case 'customers': return <CustomersManagement />;
      case 'debtors': return <DebtorsManagement />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />; // Bu yerda admin ekanligini tekshirish mumkin
      default: return <div>Sahifa topilmadi</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Sidebar 
        activePage={activePage} 
        onNavigate={setActivePage} 
        onLogout={handleLogout} // Logout funksiyasini uzatamiz
        user={user} // User ma'lumotini ham beramiz (ismni ko'rsatish uchun)
      />
      {activePage === 'pos' ? renderContent() : <div className="flex-1 flex overflow-hidden">{renderContent()}</div>}
    </div>
  );
};

export default DesktopLayout;