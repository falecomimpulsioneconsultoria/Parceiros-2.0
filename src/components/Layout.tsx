import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Package, DollarSign, QrCode, LogOut, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Funil de Vendas', href: '/funnel', icon: Package },
    { name: 'Meus Clientes', href: '/clients', icon: Users },
    { name: 'Clientes da Rede', href: '/network-clients', icon: Users },
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
        "fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-100 transform transition-all duration-300 ease-in-out flex flex-col",
        isCollapsed ? "w-20" : "w-64",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className={cn(
          "h-16 flex items-center border-b border-slate-100 transition-all duration-300 relative",
          isCollapsed ? "px-4 justify-center" : "px-6 justify-between"
        )}>
          {!isCollapsed && <span className="text-xl font-semibold text-indigo-600 truncate">Parceiros Impulsione</span>}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-slate-100 rounded-full items-center justify-center text-slate-300 hover:text-indigo-600 hover:border-indigo-100 shadow-sm z-10"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
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
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                  isCollapsed ? "px-0 justify-center h-10 w-10 mx-auto" : "px-3 py-2",
                  isActive 
                    ? "bg-indigo-50/50 text-indigo-600" 
                    : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-900"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-4.5 w-4.5 shrink-0", isCollapsed ? "" : "mr-3", isActive ? "text-indigo-600" : "text-slate-400")} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn("border-t border-slate-100 transition-all duration-300", isCollapsed ? "p-4" : "p-4")}>
          <button 
            onClick={signOut}
            className={cn(
              "flex items-center text-sm font-medium text-slate-500 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 w-full",
              isCollapsed ? "justify-center h-10 w-10 mx-auto p-0" : "px-3 py-2"
            )}
            title={isCollapsed ? "Sair" : undefined}
          >
            <LogOut className={cn("h-4.5 w-4.5 shrink-0 text-slate-400", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-100 flex items-center px-4 justify-between">
          <span className="text-xl font-semibold text-indigo-600">PartnerCRM</span>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -mr-2 text-slate-500 hover:bg-slate-50 rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
