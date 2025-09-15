// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import AuthProvider from './components/AuthProvider';
import { FirebaseProvider } from './contexts/FirebaseContext'; 

// Importe todas as suas páginas
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import StoresPage from './pages/StoresPage';
import CashRegisterPage from './pages/CashRegisterPage';
import FinancialOverviewPage from './pages/FinancialOverviewPage'; 
import ProductAttributesPage from './pages/ProductAttributesPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import SizeGradeManagementPage from './pages/SizeGradeManagementPage';
import ColorManagementPage from './pages/ColorManagementPage';
import SupplierManagementPage from './pages/SupplierManagementPage';
import PaymentSettingsPage from './pages/PaymentSettingsPage';
import UsersPage from './pages/UsersPage';
import CustomersPage from './pages/CustomersPage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import PurchasesPage from './pages/PurchasesPage';
import RevenuesPage from './pages/RevenuesPage';
import RevenueCategoryManagementPage from './pages/RevenueCategoryManagementPage';
import UserPerformancePage from './pages/UserPerformancePage';
import ReportsPage from './pages/ReportsPage';
// NOVO: Imports para as páginas de Contagem de Estoque
import StockCountPage from './pages/StockCountPage';
import StockCountSessionPage from './pages/StockCountSessionPage';
// NOVO: Import para a página de Inventário
import InventoryPage from './pages/InventoryPage';

function App() {
  return (
    <Router>
      <FirebaseProvider> 
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<PrivateRoute />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              {/* NOVO: Rota para a nova página de Inventário */}
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/revenues" element={<RevenuesPage />} />
              <Route path="/stores" element={<StoresPage />} />
              <Route path="/cash-register" element={<CashRegisterPage />} />
              <Route path="/financial-overview" element={<FinancialOverviewPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:userId/performance" element={<UserPerformancePage />} /> 
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:customerId" element={<CustomerProfilePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              
              <Route path="/stock-count" element={<StockCountPage />} />
              <Route path="/stock-count/:countId" element={<StockCountSessionPage />} />
              
              <Route path="/settings/product-attributes" element={<ProductAttributesPage />} />
              <Route path="/settings/categories" element={<CategoryManagementPage />} />
              <Route path="/settings/revenue-categories" element={<RevenueCategoryManagementPage />} />
              <Route path="/settings/size-grades" element={<SizeGradeManagementPage />} />
              <Route path="/settings/colors" element={<ColorManagementPage />} />
              <Route path="/settings/suppliers" element={<SupplierManagementPage />} />
              <Route path="/settings/payment-methods" element={<PaymentSettingsPage />} />
            </Route>

            <Route path="*" element={<div>404: Página Não Encontrada</div>} />
          </Routes>
        </AuthProvider>
      </FirebaseProvider>
    </Router>
  );
}

export default App;
