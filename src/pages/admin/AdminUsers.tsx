import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Shield, User, UserCog, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Database } from '../../lib/database.types';

type Profile = {
  id: string;
  role: 'admin' | 'partner' | 'client';
  email: string;
  created_at: string;
};

export function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setMessage({ type: 'error', text: 'Não foi possível carregar os usuários.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'partner' | 'client') => {
    setUpdatingId(userId);
    setMessage(null);

    try {
      const updateData: Database['public']['Tables']['profiles']['Update'] = { role: newRole };
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setMessage({ type: 'success', text: 'Cargo atualizado com sucesso!' });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao atualizar cargo:', error);
      setMessage({ type: 'error', text: 'Erro ao atualizar o cargo do usuário.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><Shield className="w-3 h-3 mr-1" /> Admin</span>;
      case 'partner': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"><UserCog className="w-3 h-3 mr-1" /> Parceiro</span>;
      case 'client': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800"><User className="w-3 h-3 mr-1" /> Cliente</span>;
      default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{role}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Usuários e Cargos</h1>
          <p className="text-slate-500 mt-1">Altere as permissões de acesso dos usuários do sistema.</p>
        </div>
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por e-mail ou ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo Atual</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data de Cadastro</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Carregando usuários...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                          {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{user.email || 'Sem e-mail'}</div>
                          <div className="text-xs text-slate-500 font-mono">{user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                          disabled={updatingId === user.id}
                          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                        >
                          <option value="client">Cliente</option>
                          <option value="partner">Parceiro</option>
                          <option value="admin">Admin</option>
                        </select>
                        {updatingId === user.id && (
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
