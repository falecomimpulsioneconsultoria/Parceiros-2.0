import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Search, Shield, User, UserCog, AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Database } from '../../lib/database.types';

type Profile = {
  id: string;
  role: 'admin' | 'partner' | 'client';
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  referred_by: string | null;
};

export function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createData, setCreateData] = useState({ full_name: '', email: '', phone: '', password: '', role: 'client', referred_by: '' });
  const [isCreating, setIsCreating] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ id: '', full_name: '', phone: '', role: 'client', status: 'Ativo', referred_by: '' });
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setMessage(null);

    try {
      const secondarySupabase = createClient<Database>(
        import.meta.env.VITE_SUPABASE_URL || '',
        import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

      const { data: authData, error: authError } = await secondarySupabase.auth.signUp({
        email: createData.email,
        password: createData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const updateData: Database['public']['Tables']['profiles']['Update'] = { 
          full_name: createData.full_name,
          phone: createData.phone.trim() !== '' ? createData.phone.trim() : null,
          role: createData.role as 'admin' | 'partner' | 'client',
          referred_by: createData.referred_by.trim() !== '' ? createData.referred_by.trim() : null
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
        
        setMessage({ type: 'success', text: 'Usuário criado com sucesso!' });
        setIsCreateModalOpen(false);
        setCreateData({ full_name: '', email: '', phone: '', password: '', role: 'client', referred_by: '' });
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao criar o usuário e atribuir cargo.' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (user: Profile) => {
    setEditData({
      id: user.id,
      full_name: (user as any).full_name || '', // full_name não tá tipado visualmente mas existe no banco/componente
      phone: user.phone || '',
      role: user.role,
      status: user.status || 'Ativo',
      referred_by: user.referred_by || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    try {
      const updateData: Database['public']['Tables']['profiles']['Update'] = { 
        full_name: editData.full_name,
        phone: editData.phone.trim() !== '' ? editData.phone.trim() : null,
        role: editData.role as 'admin' | 'partner' | 'client',
        status: editData.status,
        referred_by: editData.referred_by.trim() !== '' ? editData.referred_by.trim() : null
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', editData.id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Usuário atualizado com sucesso!' });
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      setMessage({ type: 'error', text: 'Erro ao atualizar o usuário.' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsUpdating(false);
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

  const getStatusBadge = (status: string) => {
    if (status === 'Ativo') {
      return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-lg">Ativo</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg">Inativo</span>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Usuários e Cargos</h1>
          <p className="text-slate-500 mt-1">Altere as permissões de acesso dos usuários do sistema.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Novo Usuário
        </button>
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
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Indicado por</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cadastro</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Carregando usuários...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {user.referred_by ? (
                        <span className="font-mono text-xs" title={user.referred_by}>
                          {user.referred_by.substring(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Novo Usuário/Parceiro</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={createData.full_name}
                  onChange={e => setCreateData({...createData, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={createData.email}
                  onChange={e => setCreateData({...createData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Ex: 5511999999999"
                  value={createData.phone}
                  onChange={e => setCreateData({...createData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha provisória</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createData.password}
                  onChange={e => setCreateData({...createData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                <select
                  value={createData.role}
                  onChange={e => setCreateData({...createData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                >
                  <option value="client">Cliente</option>
                  <option value="partner">Parceiro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Indicado por (Opcional)</label>
                <select
                  value={createData.referred_by}
                  onChange={e => setCreateData({...createData, referred_by: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                >
                  <option value="">Selecione um parceiro (Opcional)</option>
                  {users
                    .filter(u => u.role === 'partner' || u.role === 'admin')
                    .map(partner => (
                      <option key={partner.id} value={partner.id}>
                        {partner.email || partner.id} ({partner.role === 'admin' ? 'Admin' : 'Parceiro'})
                      </option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isCreating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Criar Usuário'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Editar Usuário/Parceiro</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editData.full_name}
                  onChange={e => setEditData({...editData, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Ex: 5511999999999"
                  value={editData.phone}
                  onChange={e => setEditData({...editData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                  <select
                    value={editData.role}
                    onChange={e => setEditData({...editData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                  >
                    <option value="client">Cliente</option>
                    <option value="partner">Parceiro</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={editData.status}
                    onChange={e => setEditData({...editData, status: e.target.value})}
                    className={cn(
                      "w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:border-transparent outline-none font-medium",
                      editData.status === 'Ativo' ? "text-emerald-700 focus:ring-emerald-600" : "text-red-700 focus:ring-red-600"
                    )}
                  >
                    <option value="Ativo" className="text-emerald-700">Ativo</option>
                    <option value="Inativo" className="text-red-700">Inativo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Indicado por (Opcional)</label>
                <select
                  value={editData.referred_by}
                  onChange={e => setEditData({...editData, referred_by: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                >
                  <option value="">Nenhum (Remover indicação)</option>
                  {users
                    .filter(u => (u.role === 'partner' || u.role === 'admin') && u.id !== editData.id)
                    .map(partner => (
                      <option key={partner.id} value={partner.id}>
                        {partner.email || partner.id} ({partner.role === 'admin' ? 'Admin' : 'Parceiro'})
                      </option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isUpdating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
