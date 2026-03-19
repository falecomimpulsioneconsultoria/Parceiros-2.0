import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Contact, DollarSign, Settings, LogOut, Shield, Package, ChevronLeft, ChevronRight, TrendingUp, Wallet, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Visão Geral', href: '/admin' },
  { icon: Users, label: 'Parceiros e Usuários', href: '/admin/partners' },
  { icon: TrendingUp, label: 'Árvore de Rede', href: '/admin/network' },
  { icon: Contact, label: 'Clientes', href: '/admin/clients' },
  { icon: Package, label: 'Produtos', href: '/admin/products' },
  { icon: LayoutDashboard, label: 'Faturamento', href: '/admin/billing' },
  { icon: DollarSign, label: 'Extrato de Comissões', href: '/admin/commissions' },
  { icon: Wallet, label: 'Saques Pendentes', href: '/admin/withdrawals' },
  { icon: Settings, label: 'Configurações', href: '/admin/settings' },
  { icon: User, label: 'Meu Perfil', href: '/admin/profile' },
];

export function AdminLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 text-slate-300 flex flex-col fixed h-full z-10 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn(
          "h-16 flex items-center border-b border-slate-800/50 transition-all duration-300 relative",
          isCollapsed ? "px-4 justify-center" : "px-6 justify-between"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 text-white">
              <div className="bg-indigo-500 p-1.5 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-lg font-semibold truncate">Parceiros Impulsione</span>
            </div>
          )}
          {isCollapsed && (
            <div className="bg-indigo-500 p-1.5 rounded-lg text-white">
              <Shield className="w-5 h-5" />
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 border border-slate-700/50 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 shadow-lg z-20"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-0.5 mt-4">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href || (location.pathname.startsWith(item.href) && item.href !== '/admin');
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center rounded-lg font-medium transition-all duration-200",
                  isCollapsed ? "px-0 justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2",
                  isActive 
                    ? "bg-indigo-500 text-white" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                {!isCollapsed && <span className="truncate text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <button 
            onClick={signOut} 
            className={cn(
              "flex items-center font-medium rounded-lg hover:bg-slate-800 hover:text-white transition-all duration-200 text-left w-full",
              isCollapsed ? "justify-center h-10 w-10 mx-auto p-0" : "gap-3 px-3 py-2"
            )}
            title={isCollapsed ? "Sair do Painel" : undefined}
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            {!isCollapsed && <span className="truncate text-sm">Sair do Painel</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 p-8",
        isCollapsed ? "ml-20" : "ml-64"
      )}>
        <Outlet />
      </main>
    </div>
  );
}
