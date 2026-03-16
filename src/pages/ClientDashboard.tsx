import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

export function ClientDashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center">
          <div className="w-16 h-16 bg-[#075e54]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-[#075e54]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Área do Cliente</h1>
          <p className="text-slate-500 mb-6">
            Bem-vindo! Você está logado como cliente ({user?.email}).
          </p>
          
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
