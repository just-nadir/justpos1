import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TablesGrid from './components/TablesGrid';
import OrderSummary from './components/OrderSummary';
import MenuManagement from './components/MenuManagement';
import TablesManagement from './components/TablesManagement';
import CustomersManagement from './components/CustomersManagement';
import DebtorsManagement from './components/DebtorsManagement'; // Import
import Reports from './components/Reports';
import Settings from './components/Settings';

function App() {
  const [activePage, setActivePage] = useState('pos');
  const [selectedTable, setSelectedTable] = useState(null);

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
      case 'debtors': return <DebtorsManagement />; // YANGI
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      default: return <div>Sahifa topilmadi</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      {activePage === 'pos' ? renderContent() : <div className="flex-1 flex overflow-hidden">{renderContent()}</div>}
    </div>
  );
}

export default App;