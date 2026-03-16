import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, DollarSign, Settings, LogOut, Shield, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Visão Geral', href: '/admin' },
  { icon: Users, label: 'Parceiros', href: '/admin/partners' },
  { icon: Shield, label: 'Usuários', href: '/admin/users' },
  { icon: Package, label: 'Produtos', href: '/admin/products' },
  { icon: DollarSign, label: 'Saques Pendentes', href: '/admin/withdrawals' },
  { icon: Settings, label: 'Configurações', href: '/admin/settings' },
];

export function AdminLayout() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full z-10">
        <div className="p-6 flex items-center gap-3 text-white">
          <div className="bg-indigo-500 p-2 rounded-lg">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold">Super Admin</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href || (location.pathname.startsWith(item.href) && item.href !== '/admin');
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors",
                  isActive 
                    ? "bg-indigo-600 text-white" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium w-full hover:bg-slate-800 hover:text-white transition-colors text-left">
            <LogOut className="w-5 h-5" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}
