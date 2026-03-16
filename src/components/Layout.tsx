import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Package, DollarSign, QrCode, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Funil de Vendas', href: '/funnel', icon: Package },
    { name: 'Meus Clientes', href: '/clients', icon: Users },
    { name: 'Minha Rede', href: '/network', icon: Users },
    { name: 'Comissões', href: '/commissions', icon: DollarSign },
    { name: 'Meus Links & QR', href: '/links', icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <span className="text-xl font-bold text-indigo-600">PartnerCRM</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-indigo-700" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={signOut}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-slate-400" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
          <span className="text-xl font-bold text-indigo-600">PartnerCRM</span>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -mr-2 text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
