import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ClientDashboard } from './pages/ClientDashboard';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { LinksPage } from './pages/LinksPage';
import { NetworkPage } from './pages/NetworkPage';
import { ClientsPage } from './pages/ClientsPage';
import { FunnelPage } from './pages/FunnelPage';
import { CommissionsPage } from './pages/CommissionsPage';
import { LeadCapturePage } from './pages/LeadCapturePage';

// Admin Pages
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminPartners } from './pages/admin/AdminPartners';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminWithdrawals } from './pages/admin/AdminWithdrawals';
import { AdminSettings } from './pages/admin/AdminSettings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/capture/:productId" element={<LeadCapturePage />} />

          {/* Partner App Routes */}
          <Route element={<ProtectedRoute allowedRoles={['partner']} />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="links" element={<LinksPage />} />
              <Route path="network" element={<NetworkPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="funnel" element={<FunnelPage />} />
              <Route path="commissions" element={<CommissionsPage />} />
            </Route>
          </Route>

          {/* Super Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="partners" element={<AdminPartners />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="withdrawals" element={<AdminWithdrawals />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* Client Routes */}
          <Route element={<ProtectedRoute allowedRoles={['client']} />}>
            <Route path="/client" element={<ClientDashboard />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
