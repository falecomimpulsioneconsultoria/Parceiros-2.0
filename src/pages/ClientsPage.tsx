import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Mail, Phone, UserPlus, CheckCircle2, X, Package, AlertCircle, CreditCard, Plus, Trash2, ShoppingBag, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  profiles?: { full_name: string, email: string } | null;
  lead_deals?: LeadDeal[];
};
type Product = Database['public']['Tables']['products']['Row'];
type LeadDeal = Database['public']['Tables']['lead_deals']['Row'] & {
  products?: { name: string } | null;
};

type DealFormRow = {
  id?: string;
  product_id: string;
  status: string;
  value: string;
  payment_method: string;
  notes: string;
};

const STATUS_STYLE: Record<string, string> = {
  'Fechado':       'bg-emerald-100 text-emerald-700',
  'Em Negociação': 'bg-amber-100 text-amber-700',
  'Lead':          'bg-blue-100 text-blue-700',
  'Perdido':       'bg-red-100 text-red-700',
};

type KanbanStage = {
  id: string;
  name: string;
  color: string;
};

export function ClientsPage() {
  const [searchTerm, setSearchTerm]       = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Lead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expandedRows, setExpandedRows]   = useState<Set<string>>(new Set());
  const [viewMode, setViewMode]           = useState<'list' | 'kanban'>('list');
  const [stages, setStages]               = useState<KanbanStage[]>([
    { id: 'Lead', name: 'Lead', color: '#3b82f6' },
    { id: 'Em Negociação', name: 'Em Negociação', color: '#f59e0b' },
    { id: 'Fechado', name: 'Fechado', color: '#10b981' },
    { id: 'Perdido', name: 'Perdido', color: '#ef4444' }
  ]);

  const [leads, setLeads]           = useState<Lead[]>([]);
  const [networkLeads, setNetworkLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDeals, setSavingDeals] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const { user }    = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // Client form — personal info only
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  // Deals sub-form rows
  const [dealRows, setDealRows] = useState<DealFormRow[]>([]);

  useEffect(() => { if (user) loadData(); }, [user]);

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles').select('role').eq('id', user?.id).single();
      const adminFlag = profileData?.role === 'admin';
      setIsAdmin(adminFlag);

      const { data: productsData } = await supabase
        .from('products').select('*').eq('status', 'Ativo');
      if (productsData) setProducts(productsData);

      // Fetch leads with their deals and profiles
      let query = supabase
        .from('leads')
        .select(`
          *,
          profiles (full_name, email),
          lead_deals (
            id, status, value, payment_method, notes, product_id, created_at,
            products (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (!adminFlag) query = query.eq('partner_id', user?.id);

      const { data: leadsData, error } = await query;
      if (error) throw error;
      setLeads((leadsData as Lead[]) || []);

      // Clientes da rede: sub-parceiros indicados pelo usuário atual
      if (!adminFlag) {
        const { data: networkPartners } = await supabase
          .from('profiles')
          .select('id')
          .eq('referred_by', user?.id)
          .eq('role', 'partner');

        if (networkPartners && networkPartners.length > 0) {
          const networkPartnerIds = networkPartners.map((p: any) => p.id);
          const { data: networkLeadsData } = await supabase
            .from('leads')
            .select(`
              id, name, created_at,
              lead_deals (
                id, status, value, product_id, created_at,
                products (name)
              )
            `)
            .in('partner_id', networkPartnerIds)
            .order('created_at', { ascending: false });
          setNetworkLeads((networkLeadsData as Lead[]) || []);
        } else {
          setNetworkLeads([]);
        }
      }

      // Buscar estágios do sistema
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('lead_stages')
        .eq('id', 1)
        .single();
      
      if (settingsData?.lead_stages) {
        setStages(settingsData.lead_stages);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setMessage({ type: 'error', text: 'Não foi possível carregar os clientes.' });
    } finally {
      setLoading(false);
    }
  };

  const loadDealsForClient = async (leadId: string) => {
    const { data } = await supabase
      .from('lead_deals')
      .select('*, products (name)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });

    setDealRows((data || []).map((d: LeadDeal) => ({
      id: d.id,
      product_id: d.product_id || '',
      status: d.status,
      value: d.value?.toString() || '0',
      payment_method: d.payment_method || '',
      notes: d.notes || '',
    })));
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      let leadId = selectedClient?.id;
      if (selectedClient) {
        const { error } = await supabase.from('leads')
          .update({ name: formData.name, email: formData.email, phone: formData.phone || null })
          .eq('id', selectedClient.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('leads')
          .insert([{ partner_id: user?.id as string, name: formData.name, email: formData.email, phone: formData.phone || null }])
          .select().single();
        if (error) throw error;
        leadId = data.id;
      }
      await saveDeals(leadId as string);
      setMessage({ type: 'success', text: selectedClient ? 'Cliente atualizado!' : 'Cliente adicionado!' });
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      await loadData();
      resetForm();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar cliente.' });
    } finally {
      setLoading(false);
    }
  };

  const saveDeals = async (leadId: string) => {
    setSavingDeals(true);
    try {
      for (const row of dealRows) {
        if (row.id) {
          // Busca o status anterior para detectar mudança para Fechado
          const previousStatus = (selectedClient?.lead_deals || []).find(d => d.id === row.id)?.status;
          const isClosingDeal = isAdmin && row.status === 'Fechado' && previousStatus !== 'Fechado';

          // UPDATE: nunca sobrescreve partner_id
          const upd: any = {
            product_id: row.product_id || null,
            value: parseFloat(row.value.replace(',', '.')) || 0,
            notes: row.notes || null,
          };
          if (isAdmin) {
            upd.status = row.status;
            upd.payment_method = row.payment_method || null;
          } else if (row.status !== 'Fechado') {
            upd.status = row.status;
          }
          await supabase.from('lead_deals').update(upd).eq('id', row.id);

          // Auto-comissão: quando admin fecha o negócio
          if (isClosingDeal) {
            const correctPartnerId = selectedClient?.partner_id;
            if (correctPartnerId && row.product_id) {
              // Busca commission_value do produto
              const { data: prodData } = await supabase
                .from('products')
                .select('commission_value')
                .eq('id', row.product_id)
                .single();

              const commissionAmount = prodData?.commission_value || 0;

              if (commissionAmount > 0) {
                // Upsert na tabela commissions (idempotente via deal_id único)
                await supabase.from('commissions').upsert([{
                  partner_id: correctPartnerId,
                  lead_id: leadId,
                  deal_id: row.id,
                  product_id: row.product_id,
                  amount: commissionAmount,
                  status: 'Pendente',
                }], { onConflict: 'deal_id', ignoreDuplicates: false });

                // Atualiza o saldo do parceiro
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('balance')
                  .eq('id', correctPartnerId)
                  .single();
                const currentBalance = profileData?.balance || 0;
                await supabase.from('profiles')
                  .update({ balance: currentBalance + commissionAmount })
                  .eq('id', correctPartnerId);
              }
            }
          }
        } else {
          // INSERT: usa o partner_id do lead (dono do cliente)
          const correctPartnerId = selectedClient?.partner_id || user?.id as string;
          const ins: any = {
            lead_id: leadId,
            partner_id: correctPartnerId,
            product_id: row.product_id || null,
            value: parseFloat(row.value.replace(',', '.')) || 0,
            notes: row.notes || null,
            status: (!isAdmin && row.status === 'Fechado') ? 'Lead' : row.status,
          };
          if (isAdmin) ins.payment_method = row.payment_method || null;
          await supabase.from('lead_deals').insert([ins]);
        }
      }
    } finally {
      setSavingDeals(false);
    }
  };

  const handleDeleteDeal = async (dealId: string | undefined, idx: number) => {
    if (dealId) await supabase.from('lead_deals').delete().eq('id', dealId);
    setDealRows(r => r.filter((_, i) => i !== idx));
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('Excluir este cliente e todos os seus negócios?')) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) { setMessage({ type: 'error', text: 'Erro ao excluir.' }); return; }
    setLeads(l => l.filter(x => x.id !== id));
    setIsEditModalOpen(false);
    setMessage({ type: 'success', text: 'Cliente excluído.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const addDealRow = () =>
    setDealRows(r => [...r, { product_id: '', status: 'Lead', value: '0', payment_method: '', notes: '' }]);

  const updRow = (i: number, f: keyof DealFormRow, v: string) =>
    setDealRows(r => r.map((row, idx) => idx === i ? { ...row, [f]: v } : row));

  const resetForm = () => { setFormData({ name: '', email: '', phone: '' }); setDealRows([]); setSelectedClient(null); };

  const openAddModal = () => { resetForm(); setIsAddModalOpen(true); };
  const openEditModal = async (client: Lead) => {
    setSelectedClient(client);
    setFormData({ name: client.name, email: client.email, phone: client.phone || '' });
    await loadDealsForClient(client.id);
    setIsEditModalOpen(true);
  };

  const toggleExpand = (id: string) =>
    setExpandedRows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filteredClients = leads.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allDeals = React.useMemo(() => {
    return leads.flatMap(lead => 
      (lead.lead_deals || []).map(deal => ({
        ...deal,
        lead_name: lead.name,
        lead_id: lead.id
      }))
    ).filter(deal => 
      deal.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deal.products?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  const updateDealStatus = async (dealId: string, newStatus: string) => {
    try {
      // Encontrar o negócio e o cliente no estado local
      const deal = allDeals.find(d => d.id === dealId);
      const lead = leads.find(l => l.id === deal?.lead_id);
      
      if (!deal || !lead) return;

      const previousStatus = deal.status;
      const isClosingDeal = isAdmin && newStatus === 'Fechado' && previousStatus !== 'Fechado';

      const { error } = await supabase
        .from('lead_deals')
        .update({ status: newStatus })
        .eq('id', dealId);

      if (error) throw error;

      // Se Fechado, executa mesma lógica de comissão do saveDeals
      if (isClosingDeal && deal.product_id) {
        const { data: prodData } = await supabase
          .from('products')
          .select('commission_value')
          .eq('id', deal.product_id)
          .single();

        const commissionAmount = prodData?.commission_value || 0;
        if (commissionAmount > 0) {
          await supabase.from('commissions').upsert([{
            partner_id: lead.partner_id,
            lead_id: lead.id,
            deal_id: deal.id,
            product_id: deal.product_id,
            amount: commissionAmount,
            status: 'Pendente',
          }], { onConflict: 'deal_id' });

          const { data: profileData } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', lead.partner_id)
            .single();
          
          await supabase.from('profiles')
            .update({ balance: (profileData?.balance || 0) + commissionAmount })
            .eq('id', lead.partner_id);
        }
      }

      await loadData();
      setMessage({ type: 'success', text: 'Status atualizado!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setMessage({ type: 'error', text: 'Erro ao atualizar status.' });
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Clientes</h1>
          <p className="text-slate-500 mt-1">Gerencie sua carteira de clientes e acompanhe as negociações.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button onClick={() => setViewMode('list')}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", 
                viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              Lista
            </button>
            <button onClick={() => setViewMode('kanban')}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", 
                viewMode === 'kanban' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              Kanban
            </button>
          </div>
          <button onClick={openAddModal} className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm whitespace-nowrap">
            <UserPlus className="w-5 h-5 mr-2" />Novo Cliente
          </button>
        </div>
      </div>

      {message && (
        <div className={cn("p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Clients Selection (List or Kanban) */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Lista de Clientes <span className="ml-2 text-sm font-normal text-slate-400">({leads.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Buscar cliente..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full" />
              </div>
              <button className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 flex flex-col items-center text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                Carregando clientes...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum cliente encontrado.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-8"></th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Contato</th>
                    {isAdmin && <th className="px-4 py-3">Parceiro</th>}
                    <th className="px-4 py-3">Negócios</th>
                    <th className="px-4 py-3">Cadastro</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    const deals = client.lead_deals || [];
                    const isExpanded = expandedRows.has(client.id);
                    return (
                      <React.Fragment key={client.id}>
                        {/* Client row */}
                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <button onClick={() => toggleExpand(client.id)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{client.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{client.email}</span>
                              {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{client.phone}</span>}
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {client.profiles?.full_name || client.profiles?.email || '-'}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {deals.length === 0 ? (
                                <span className="text-xs text-slate-400">Nenhum negócio</span>
                              ) : deals.slice(0, 3).map((d) => (
                                <span key={d.id} className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", STATUS_STYLE[d.status] || 'bg-slate-100 text-slate-700')}>
                                  {d.status}
                                </span>
                              ))}
                              {deals.length > 3 && (
                                <span className="text-xs text-slate-400">+{deals.length - 3} mais</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {new Date(client.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => openEditModal(client)}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                              Editar
                            </button>
                          </td>
                        </tr>

                        {/* Expanded deals rows */}
                        {isExpanded && (
                          <tr className="border-b border-slate-100 bg-indigo-50/30">
                            <td colSpan={isAdmin ? 7 : 6} className="px-6 py-3">
                              {deals.length === 0 ? (
                                <p className="text-xs text-slate-400 py-2">Este cliente ainda não tem negócios. <button onClick={() => openEditModal(client)} className="text-indigo-600 font-medium underline">Adicionar negócio</button></p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-slate-500 font-medium border-b border-indigo-100">
                                        <th className="pb-2 text-left pr-6">Produto</th>
                                        <th className="pb-2 text-left pr-6">Status</th>
                                        <th className="pb-2 text-left pr-6">Valor</th>
                                        {isAdmin && <th className="pb-2 text-left pr-6">Pagamento</th>}
                                        <th className="pb-2 text-left">Observações</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-indigo-50">
                                      {deals.map((d) => (
                                        <tr key={d.id} className="text-slate-700">
                                          <td className="py-2 pr-6 font-medium">{d.products?.name || <span className="text-slate-400">—</span>}</td>
                                          <td className="py-2 pr-6">
                                            <span className={cn("px-2 py-0.5 rounded-full font-medium", STATUS_STYLE[d.status] || 'bg-slate-100 text-slate-700')}>
                                              {d.status}
                                            </span>
                                          </td>
                                          <td className="py-2 pr-6">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.value)}
                                          </td>
                                          {isAdmin && <td className="py-2 pr-6">{d.payment_method || <span className="text-slate-400">—</span>}</td>}
                                          <td className="py-2 text-slate-500">{d.notes || <span className="text-slate-400">—</span>}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full space-y-4">
           {/* Kanban Toolbar */}
           <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Kanban de Negócios <span className="ml-2 text-sm font-normal text-slate-400">({allDeals.length})</span>
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Filtrar negócios..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full" />
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
            {stages.map(stage => {
              const stageDeals = allDeals.filter(d => d.status === (stage.id === 'negociacao' ? 'Em Negociação' : stage.name));
              return (
                <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col bg-slate-100/50 rounded-xl border border-slate-200 max-h-[70vh]">
                  <div className="p-3 flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center gap-2">
                       <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                       <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{stage.name}</h3>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{stageDeals.length}</span>
                  </div>

                  <div className="p-2 space-y-3 overflow-y-auto">
                    {stageDeals.map(deal => (
                      <div key={deal.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">{deal.lead_name}</p>
                          <button onClick={() => {
                            const l = leads.find(x => x.id === deal.lead_id);
                            if (l) openEditModal(l);
                          }} className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded text-indigo-600 transition-all">
                             <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Package className="w-3.5 h-3.5" />
                            <span className="line-clamp-1">{deal.products?.name || 'Sem Produto'}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-slate-800">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
                            </span>
                          </div>
                          
                          <div className="pt-2">
                            <select 
                              value={deal.status}
                              onChange={(e) => updateDealStatus(deal.id, e.target.value)}
                              disabled={!isAdmin && deal.status === 'Fechado'}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                            >
                              {stages.map(s => (
                                <option key={s.id} value={s.id === 'negociacao' ? 'Em Negociação' : s.name}>
                                  Mover para: {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
                        <p className="text-[10px] text-slate-400">Nenhum negócio aqui</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Network Leads Section — for partners only */}
      {!isAdmin && networkLeads.length > 0 && (
        <div className="mt-12 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 px-1">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Clientes da Minha Rede</h2>
              <p className="text-sm text-slate-500">Visualize os clientes e negócios cadastrados pelos parceiros que você indicou.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12"></th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Negócios</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {networkLeads.map((lead) => {
                  const isExpanded = expandedRows.has(lead.id);
                  return (
                    <React.Fragment key={lead.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <button onClick={() => toggleExpand(lead.id)}
                            className="p-1 hover:bg-white rounded-md transition-colors shadow-sm border border-transparent hover:border-slate-200">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">{lead.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex -space-x-2">
                            {lead.lead_deals?.slice(0, 3).map((d, i) => (
                              <div key={i} title={d.products?.name} className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600 shadow-sm">
                                {d.products?.name?.charAt(0) || 'P'}
                              </div>
                            ))}
                            {(lead.lead_deals?.length || 0) > 3 && (
                              <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm">
                                +{(lead.lead_deals?.length || 0) - 3}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-medium text-slate-400 italic">Somente Leitura</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-inner overflow-hidden animate-in slide-in-from-top-2 duration-200">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 font-medium">
                                  <tr>
                                    <th className="px-4 py-2 text-left">Produto</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                    <th className="px-4 py-2 text-right">Valor</th>
                                    <th className="px-4 py-2 text-left">Data</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {lead.lead_deals?.map((deal) => (
                                    <tr key={deal.id}>
                                      <td className="px-4 py-3 font-medium text-slate-700">{deal.products?.name || '—'}</td>
                                      <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                          deal.status === 'Fechado' ? 'bg-emerald-100 text-emerald-700' :
                                          deal.status === 'Em Negociação' ? 'bg-amber-100 text-amber-700' :
                                          deal.status === 'Perdido' ? 'bg-red-100 text-red-700' :
                                          'bg-slate-100 text-slate-700'
                                        }`}>
                                          {deal.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
                                      </td>
                                      <td className="px-4 py-3 text-slate-400 text-xs">
                                        {new Date(deal.created_at).toLocaleDateString('pt-BR')}
                                      </td>
                                    </tr>
                                  ))}
                                  {(!lead.lead_deals || lead.lead_deals.length === 0) && (
                                    <tr>
                                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">Nenhum negócio registrado.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Client Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {isEditModalOpen ? 'Detalhes do Cliente' : 'Adicionar Novo Cliente'}
              </h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead}>
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

                {/* Personal info */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />Informações Pessoais
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Nome Completo', field: 'name', type: 'text', required: true },
                      { label: 'E-mail', field: 'email', type: 'email', required: true },
                      { label: 'Telefone / WhatsApp', field: 'phone', type: 'tel', required: false },
                    ].map(({ label, field, type, required }) => (
                      <div key={field} className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">{label}</label>
                        <input type={type} required={required}
                          value={(formData as any)[field]}
                          onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Deals sub-form as a table */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                      Negócios / Produtos
                      <span className="ml-1 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{dealRows.length}</span>
                    </h4>
                    <button type="button" onClick={addDealRow}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100">
                      <Plus className="w-3.5 h-3.5 mr-1" />Novo Negócio
                    </button>
                  </div>

                  {dealRows.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhum negócio cadastrado ainda.</p>
                      <button type="button" onClick={addDealRow} className="text-sm text-indigo-600 font-medium mt-1 hover:underline">
                        + Adicionar primeiro negócio
                      </button>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 font-medium border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5 text-left">Produto</th>
                            <th className="px-4 py-2.5 text-left">Status</th>
                            <th className="px-4 py-2.5 text-left">Valor (R$)</th>
                            {isAdmin && <th className="px-4 py-2.5 text-left">Pagamento</th>}
                            <th className="px-4 py-2.5 text-left">Obs.</th>
                            <th className="px-2 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dealRows.map((deal, i) => (
                            <tr key={deal.id || i} className="bg-white hover:bg-slate-50/50 transition-colors">
                              {/* Product */}
                              <td className="px-4 py-2">
                                <select value={deal.product_id} onChange={e => updRow(i, 'product_id', e.target.value)}
                                  className="w-full min-w-[130px] border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                                  <option value="">Selecione...</option>
                                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </td>

                              {/* Status */}
                              <td className="px-4 py-2">
                                {!isAdmin && deal.status === 'Fechado' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-semibold text-emerald-700 whitespace-nowrap">
                                    ✅ Fechado <span className="font-normal text-emerald-500 text-[10px]">(Admin)</span>
                                  </span>
                                ) : (
                                  <select value={deal.status} onChange={e => updRow(i, 'status', e.target.value)}
                                    className="w-full min-w-[130px] border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                                    <option value="Lead">Lead</option>
                                    <option value="Em Negociação">Em Negociação</option>
                                    {isAdmin && <option value="Fechado">Fechado</option>}
                                    <option value="Perdido">Perdido</option>
                                  </select>
                                )}
                              </td>

                              {/* Value */}
                              <td className="px-4 py-2">
                                {isAdmin ? (
                                  <input type="number" step="0.01" value={deal.value}
                                    onChange={e => updRow(i, 'value', e.target.value)}
                                    className="w-24 border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                ) : (
                                  <span className="block px-2 py-1.5 text-xs text-slate-700 bg-slate-100 rounded-md w-24 text-right">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(deal.value) || 0)}
                                  </span>
                                )}
                              </td>

                              {/* Payment — admin only */}
                              {isAdmin && (
                                <td className="px-4 py-2">
                                  <select value={deal.payment_method} onChange={e => updRow(i, 'payment_method', e.target.value)}
                                    className="w-full min-w-[130px] border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                                    <option value="">—</option>
                                    <option value="Pix">Pix</option>
                                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                                    <option value="Cartão de Débito">Cartão de Débito</option>
                                    <option value="Boleto">Boleto</option>
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="Transferência Bancária">Transferência Bancária</option>
                                    <option value="Parcelado">Parcelado (outro)</option>
                                  </select>
                                </td>
                              )}

                              {/* Notes */}
                              <td className="px-4 py-2">
                                <input type="text" value={deal.notes} onChange={e => updRow(i, 'notes', e.target.value)}
                                  placeholder="Observações..."
                                  className="w-full min-w-[120px] border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                              </td>

                              {/* Delete */}
                              <td className="px-2 py-2">
                                <button type="button" onClick={() => handleDeleteDeal(deal.id, i)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                {isEditModalOpen && selectedClient ? (
                  <button type="button" onClick={() => handleDeleteLead(selectedClient.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-700">
                    Excluir Cliente
                  </button>
                ) : <div />}
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading || savingDeals}
                    className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50">
                    {loading || savingDeals ? 'Salvando...' : 'Salvar Cliente'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
