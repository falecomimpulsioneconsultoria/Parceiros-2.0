import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Package, DollarSign, QrCode, LogOut, Menu, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, user, role, partnerType } = useAuth();
  const isCaptador = role === 'partner' && partnerType?.toLowerCase() === 'captador';

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Funil de Vendas', href: '/funnel', icon: Package },
    { name: 'Meus Clientes', href: '/clients', icon: Users },
    { name: 'Clientes da Rede', href: '/network-clients', icon: Users, hidden: isCaptador },
    { name: 'Minha Rede', href: '/network', icon: Users, hidden: isCaptador },
    { name: 'Comissões', href: '/commissions', icon: DollarSign },
    { name: 'Meus Links & QR', href: '/links', icon: QrCode },
  ].filter(item => !item.hidden);

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out flex flex-col h-full",
        isCollapsed ? "w-20" : "w-64",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isCaptador ? "bg-[#075e54] border-r-white/10" : "bg-white border-r-slate-100"
      )}>
        <div className={cn(
          "h-16 shrink-0 flex items-center transition-all duration-300 relative",
          isCollapsed ? "px-4 justify-center" : "px-6 justify-between",
          isCaptador ? "border-b-white/10" : "border-b-slate-100"
        )}>
          {!isCollapsed && <span className={cn(
            "text-xl font-bold truncate",
            isCaptador ? "text-white" : "text-indigo-600"
          )}>Parceiros Impulsione</span>}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-slate-100 rounded-full items-center justify-center text-slate-300 hover:text-indigo-600 hover:border-indigo-100 shadow-md z-10"
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
                    ? (isCaptador ? "bg-white/15 text-white shadow-sm" : "bg-indigo-50/50 text-indigo-600")
                    : (isCaptador ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-900")
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn(
                  "h-4.5 w-4.5 shrink-0", 
                  isCollapsed ? "" : "mr-3", 
                  isActive 
                    ? (isCaptador ? "text-white" : "text-indigo-600") 
                    : (isCaptador ? "text-white/60" : "text-slate-400")
                )} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn("transition-all duration-300 shrink-0", isCollapsed ? "p-4" : "p-4 space-y-1", isCaptador ? "border-t-white/10" : "border-t-slate-100")}>
          <Link
            to="/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
              "flex items-center text-sm font-medium transition-all duration-200 w-full",
              isCollapsed ? "justify-center h-10 w-10 mx-auto p-0" : "px-3 py-2",
              location.pathname === '/profile'
                ? (isCaptador ? "bg-white/15 text-white shadow-sm" : "bg-indigo-50/50 text-indigo-600")
                : (isCaptador ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")
            )}
            title={isCollapsed ? "Meu Perfil" : undefined}
          >
            <User className={cn("h-4.5 w-4.5 shrink-0", isCollapsed ? "" : "mr-3", location.pathname === '/profile' ? (isCaptador ? "text-white" : "text-indigo-600") : (isCaptador ? "text-white/60" : "text-slate-400"))} />
            {!isCollapsed && <span>Meu Perfil</span>}
          </Link>

          <div className={cn(
            "px-4 text-[10px] font-medium uppercase tracking-widest opacity-60 mt-auto mb-2",
            isCollapsed ? "hidden" : (isCaptador ? "text-white" : "text-slate-500")
          )}>
            Versão 2.1.0
          </div>
          <button 
            onClick={signOut}
            className={cn(
              "flex items-center text-sm font-medium transition-all duration-200 w-full",
              isCollapsed ? "justify-center h-10 w-10 mx-auto p-0" : "px-3 py-2",
              isCaptador 
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
            title={isCollapsed ? "Sair" : undefined}
          >
            <LogOut className={cn("h-4.5 w-4.5 shrink-0", isCollapsed ? "" : "mr-3", isCaptador ? "text-white/60" : "text-slate-400")} />
            {!isCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className={cn(
          "lg:hidden h-16 border-b flex items-center px-4 justify-between",
          isCaptador ? "bg-[#075e54] border-white/10" : "bg-white border-slate-100"
        )}>
          <span className={cn(
            "text-xl font-bold",
            isCaptador ? "text-white" : "text-indigo-600"
          )}>Parceiros Impulsione</span>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className={cn(
              "p-2 -mr-2 rounded-lg transition-colors",
              isCaptador ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-50"
            )}
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
