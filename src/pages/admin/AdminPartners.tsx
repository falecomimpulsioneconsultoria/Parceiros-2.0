import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, CheckCircle2, XCircle, UserPlus, X, Shield, Plus, AlertCircle, Copy, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { cn } from '../../lib/utils';
import type { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'] & { level?: string | null };

export function AdminPartners() {
  const [partners, setPartners] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Modal de Criação
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createData, setCreateData] = useState({ 
    full_name: '', 
    email: '', 
    phone: '', 
    password: '', 
    referred_by: '',
    partner_type: 'vendedor' as 'vendedor' | 'captador',
    level: 'Afiliado'
  });

  // Modal de Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Profile | null>(null);
  const [editData, setEditData] = useState({ 
    full_name: '', 
    phone: '', 
    referred_by: '', 
    partner_type: 'vendedor' as 'vendedor' | 'captador',
    level: 'Afiliado'
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['partner', 'admin'])
        .order('role', { ascending: true }) // Admin primeiro
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Erro ao buscar parceiros:', error);
      setMessage({ type: 'error', text: 'Não foi possível carregar a lista de parceiros.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.referred_by) {
      alert('O campo "Indicado por" é obrigatório.');
      return;
    }

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
          role: 'partner',
          referred_by: createData.referred_by,
          partner_type: createData.partner_type,
          level: createData.level,
          status: 'Ativo'
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
        
        setMessage({ type: 'success', text: 'Parceiro criado com sucesso!' });
        setIsSuccess(true);
        setCreateData({ 
          full_name: '', 
          email: '', 
          phone: '', 
          password: '', 
          referred_by: '',
          partner_type: 'vendedor',
          level: 'Afiliado'
        });
        fetchPartners();
      }
    } catch (error: any) {
      console.error('Erro ao criar parceiro:', error);
      let errorMsg = 'Erro ao criar o parceiro.';
      if (error.message?.includes('registered')) {
        errorMsg = 'Este e-mail já está cadastrado no sistema.';
      }
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsCreating(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          phone: editData.phone.trim() !== '' ? editData.phone.trim() : null,
          referred_by: editData.referred_by || null,
          partner_type: editData.partner_type,
          level: editData.level
        })
        .eq('id', editingPartner.id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Parceiro atualizado com sucesso!' });
      setIsEditModalOpen(false);
      fetchPartners();
    } catch (error) {
      console.error('Erro ao atualizar parceiro:', error);
      setMessage({ type: 'error', text: 'Erro ao atualizar parceiro.' });
    }
  };

  const openEditModal = (partner: Profile) => {
    setEditingPartner(partner);
    setEditData({
      full_name: partner.full_name || '',
      phone: partner.phone || '',
      referred_by: partner.referred_by || '',
      partner_type: (partner.partner_type as 'vendedor' | 'captador') || 'vendedor',
      level: partner.level || 'Afiliado'
    });
    setIsEditModalOpen(true);
  };

  const toggleStatus = async (partner: Profile) => {
    const newStatus = partner.status === 'Ativo' ? 'Bloqueado' : 'Ativo';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', partner.id);
      
      if (error) throw error;
      setPartners(partners.map(p => p.id === partner.id ? { ...p, status: newStatus } : p));
    } catch (error) {
      alert('Erro ao alterar status.');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-emerald-100 text-emerald-700';
      case 'Bloqueado': return 'bg-red-100 text-red-700';
      case 'Pendente': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredPartners = partners.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Parceiros</h1>
          <p className="text-slate-500 mt-1">Administre os usuários parceiros e suas contas de acesso.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Novo Parceiro (Gera Login)
        </button>
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-4",
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
              placeholder="Buscar por nome ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Parceiro / Nível</th>
                <th className="px-6 py-4">Cargo / Tipo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Saldo Atual</th>
                <th className="px-6 py-4">Indicação</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Carregando parceiros reais...
                  </td>
                </tr>
              ) : filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhum parceiro encontrado no banco de dados.
                  </td>
                </tr>
              ) : (
                filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{partner.full_name || 'Sem nome'}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-slate-200">
                          {partner.level || 'Afiliado'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{partner.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {partner.role === 'admin' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-tighter">
                          Admin
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-tighter w-fit">
                            Parceiro
                          </span>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border w-fit",
                            partner.partner_type === 'captador' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-blue-50 text-blue-700 border-blue-100"
                          )}>
                            {partner.partner_type === 'captador' ? 'Captador' : 'Vendedor'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", getStatusStyle(partner.status))}>
                        {partner.status === 'Ativo' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {partner.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                      R$ {partner.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                        {partner.id.substring(0, 12)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {partner.role !== 'admin' && (
                          <div className="flex flex-col gap-1 items-end">
                            <button 
                              onClick={() => openEditModal(partner)}
                              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs px-3 py-1 bg-indigo-50 rounded-lg"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => toggleStatus(partner)}
                              className={cn(
                                "text-xs font-bold transition-all px-3 py-1 rounded-lg",
                                partner.status === 'Ativo' ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"
                              )}
                            >
                              {partner.status === 'Ativo' ? 'Bloquear' : 'Ativar'}
                            </button>
                          </div>
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

      {/* Modal de Criação Unificado */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/20">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Novo Parceiro</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cria acesso automático</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsSuccess(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-100 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSuccess ? (
              <div className="p-10 text-center space-y-6 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-2xl font-extrabold text-slate-900">Cadastro Concluído!</h4>
                  <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                    O parceiro foi criado com sucesso e o acesso já está ativo no sistema.
                  </p>
                </div>
                <div className="pt-4 flex flex-col gap-3">
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="w-full py-4 bg-indigo-600 text-white text-sm font-extrabold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    Ir para Tela de Login
                    <LinkIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsSuccess(false);
                      setIsCreateModalOpen(false);
                    }}
                    className="w-full py-4 text-slate-500 text-sm font-bold hover:text-slate-800 transition-colors"
                  >
                    Continuar no Painel
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreatePartner} className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do parceiro"
                    value={createData.full_name}
                    onChange={e => setCreateData({...createData, full_name: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">E-mail de Acesso</label>
                  <input
                    type="email"
                    required
                    placeholder="exemplo@email.com"
                    value={createData.email}
                    onChange={e => setCreateData({...createData, email: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium placeholder:opacity-30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">WhatsApp</label>
                    <input
                      type="text"
                      placeholder="55..."
                      value={createData.phone}
                      onChange={e => setCreateData({...createData, phone: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Senha Inicial</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="******"
                      value={createData.password}
                      onChange={e => setCreateData({...createData, password: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Perfil do Parceiro</label>
                  <div className="flex p-1 bg-slate-100 rounded-2xl">
                    <button 
                      type="button"
                      onClick={() => setCreateData({...createData, partner_type: 'vendedor'})}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                        createData.partner_type === 'vendedor' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Vendedor
                    </button>
                    <button 
                      type="button"
                      onClick={() => setCreateData({...createData, partner_type: 'captador'})}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                        createData.partner_type === 'captador' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Captador
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Nível de Carreira</label>
                  <select
                    value={createData.level}
                    onChange={e => setCreateData({...createData, level: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  >
                    <option value="Afiliado">Nível 1: Afiliado</option>
                    <option value="Premium">Nível 2: Premium</option>
                    <option value="Master">Nível 3: Master</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Indicado por (Obrigatório)</label>
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">Urgente</span>
                  </div>
                  <select
                    required
                    value={createData.referred_by}
                    onChange={e => setCreateData({...createData, referred_by: e.target.value})}
                    className="w-full px-5 py-3.5 bg-white border-2 border-indigo-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-900 shadow-sm"
                  >
                    <option value="">Selecione quem indicou...</option>
                    {partners
                      .filter(p => p.role === 'partner' || (p as any).role === 'admin')
                      .map(partner => (
                        <option key={partner.id} value={partner.id}>
                          {partner.full_name || partner.email}
                        </option>
                    ))}
                    <option value="admin-root">Administrador Root (FaleCom)</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full py-4 bg-indigo-600 text-white text-sm font-extrabold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2 group/btn active:scale-[0.98]"
                  >
                    {isCreating ? (
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        Criar e Ativar Conta
                        <CheckCircle2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição Completa */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/20">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Editar Parceiro</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Alterar perfil e indicação</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-100 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePartner} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editData.full_name}
                  onChange={e => setEditData({...editData, full_name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Telefone/WhatsApp</label>
                <input
                  type="text"
                  value={editData.phone}
                  onChange={e => setEditData({...editData, phone: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Perfil do Parceiro</label>
                  <div className="flex p-1 bg-slate-100 rounded-2xl">
                    <button 
                      type="button"
                      onClick={() => setEditData({...editData, partner_type: 'vendedor'})}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                        editData.partner_type === 'vendedor' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Vendedor
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditData({...editData, partner_type: 'captador'})}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                        editData.partner_type === 'captador' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Captador
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Nível de Carreira</label>
                  <select
                    value={editData.level}
                    onChange={e => setEditData({...editData, level: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  >
                    <option value="Afiliado">Nível 1: Afiliado</option>
                    <option value="Premium">Nível 2: Premium</option>
                    <option value="Master">Nível 3: Master</option>
                  </select>
                </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Indicado por</label>
                <select
                  required
                  value={editData.referred_by}
                  onChange={e => setEditData({...editData, referred_by: e.target.value})}
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-900"
                >
                  <option value="">Selecione quem indicou...</option>
                  {partners
                    .filter(p => p.role === 'partner')
                    .map(partner => (
                      <option key={partner.id} value={partner.id}>
                        {partner.full_name || partner.email}
                      </option>
                  ))}
                  <option value="admin-root">Administrador Root (FaleCom)</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white text-sm font-extrabold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group/btn active:scale-[0.98]"
                >
                  Salvar Alterações
                  <CheckCircle2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
