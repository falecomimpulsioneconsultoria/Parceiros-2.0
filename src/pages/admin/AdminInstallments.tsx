import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, DollarSign, Filter, Search, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronRight, Package, User, TrendingUp, Pencil, X, ExternalLink, Copy } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Installment {
  id: string;
  installment_number: number;
  label: string;
  value: number;
  status: 'Pendente' | 'Pago' | 'Atrasado';
  due_date: string;
  paid_at: string | null;
  deal_id: string;
  payment_link?: string | null;
  payment_provider?: string | null;
  lead_deals: {
    id: string; // Deal ID
    lead_id: string;
    product_id: string;
    leads: { name: string; captador_id?: string; partner_id?: string };
    products: { 
      name: string; 
      commission_direct?: number;
      commission_indicator?: number;
      commission_captador?: number;
      commission_lvl1?: number;
      commission_lvl2?: number;
    };
    partner_id: string;
    captador_id?: string;
    partner: { full_name: string }; // Partner profile alias
  };
}

export function AdminInstallments() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);
  const [expandedPartners, setExpandedPartners] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const togglePartner = (id: string) => {
    const next = new Set(expandedPartners);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedPartners(next);
  };

  const toggleClient = (id: string) => {
    const next = new Set(expandedClients);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedClients(next);
  };

  useEffect(() => {
    loadInstallments();
  }, []);

  const loadInstallments = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('deal_installments')
        .select(`
          *,
          lead_deals (
            lead_id,
            product_id,
            partner_id,
            captador_id,
            leads (name, captador_id, partner_id),
            products (
              name, 
              commission_direct, 
              commission_indicator, 
              commission_captador, 
              commission_lvl1, 
              commission_lvl2
            ),
            partner:profiles!lead_deals_partner_id_fkey (full_name)
          )
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setInstallments(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar parcelas:', error);
      setMessage({ type: 'error', text: 'Não foi possível carregar as parcelas.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFaturar = async (inst: Installment) => {
    try {
      setLoading(true);
      // 1. Marcar como pago - O Gatilho SQL (tr_installment_paid) cuidará da geração de comissões automaticamente
      const { error: updError } = await (supabase as any)
        .from('deal_installments')
        .update({ 
          status: 'Pago',
          paid_at: new Date().toISOString()
        })
        .eq('id', inst.id);

      if (updError) throw updError;

      setMessage({ type: 'success', text: 'Parcela faturada com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
      loadInstallments();
    } catch (error: any) {
      console.error('Erro no faturamento:', error);
      setMessage({ type: 'error', text: `Erro: ${error.message || 'Falha ao processar comissões'}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingInstallment) return;
    try {
      setLoading(true);
      const { error } = await (supabase as any)
        .from('deal_installments')
        .update({
          due_date: editingInstallment.due_date
        })
        .eq('id', editingInstallment.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Parcela atualizada!' });
      setIsEditModalOpen(false);
      setEditingInstallment(null);
      loadInstallments();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredInstallments = installments.filter(inst => {
    const marchesSearch = (inst.lead_deals?.leads?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (inst.lead_deals?.products?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || inst.status === statusFilter;
    return marchesSearch && matchesStatus;
  });

  const kpis = {
    totalPendente: filteredInstallments.filter(i => i.status === 'Pendente').reduce((sum, i) => sum + i.value, 0),
    totalPago: filteredInstallments.filter(i => i.status === 'Pago').reduce((sum, i) => sum + i.value, 0),
    vencendoMes: filteredInstallments.filter(i => {
      const d = new Date(i.due_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && i.status !== 'Pago';
    }).length,
    atrasadas: filteredInstallments.filter(i => i.status === 'Atrasado' || (new Date(i.due_date) < new Date() && i.status === 'Pendente')).length
  };

  // Agrupamento Hierárquico: Parceiro > Cliente > Negócio > Parcelas
  const groupedData = filteredInstallments.reduce((acc: any, inst) => {
    const partnerId = inst.lead_deals?.partner_id || 'no-partner';
    const partnerName = (inst.lead_deals as any)?.partner?.full_name || 'Sem Parceiro';
    const clientId = inst.lead_deals?.lead_id || 'no-client';
    const clientName = inst.lead_deals?.leads?.name || 'Sem Cliente';
    const dealId = inst.lead_deals?.id || 'no-deal';
    const productName = inst.lead_deals?.products?.name || 'Sem Produto';

    if (!acc[partnerId]) {
      acc[partnerId] = { 
        name: partnerName, 
        clients: {},
        stats: {
          pendingCount: 0,
          pendingAmount: 0,
          paidCount: 0,
          paidAmount: 0,
          totalCommissions: 0
        }
      };
    }

    // Calcular estatísticas do parceiro
    const config = (inst as any).commissions_config;
    if (inst.status === 'Pago') {
      acc[partnerId].stats.paidCount++;
      acc[partnerId].stats.paidAmount += inst.value;
      acc[partnerId].stats.totalCommissions += (config?.vendedor || 0);
    } else {
      acc[partnerId].stats.pendingCount++;
      acc[partnerId].stats.pendingAmount += inst.value;
    }

    if (!acc[partnerId].clients[clientId]) {
      acc[partnerId].clients[clientId] = { name: clientName, deals: {} };
    }
    if (!acc[partnerId].clients[clientId].deals[dealId]) {
      acc[partnerId].clients[clientId].deals[dealId] = { productName, installments: [] };
    }

    acc[partnerId].clients[clientId].deals[dealId].installments.push(inst);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Parcelas</h1>
            <p className="text-sm text-slate-500 font-medium">Controle financeiro e faturamento de contratos parcelados</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'A Receber (Total)', value: kpis.totalPendente, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Recebido', value: kpis.totalPago, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Vencendo no Mês', value: kpis.vencendoMes, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', isCount: true },
          { label: 'Parcelas em Atraso', value: kpis.atrasadas, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', isCount: true },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", kpi.bg)}>
                <kpi.icon className={cn("w-6 h-6", kpi.color)} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <p className={cn("text-xl font-black mt-0.5", kpi.color)}>
                  {kpi.isCount ? kpi.value : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpi.value)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex bg-slate-100/50 p-1 rounded-xl gap-1">
            {['Todos', 'Pendente', 'Pago', 'Atrasado'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                  statusFilter === s ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grouped View */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-20 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando parcelas...</p>
            </div>
          </div>
        ) : Object.keys(groupedData).length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-20 text-center text-slate-400 font-medium">
            Nenhuma parcela encontrada.
          </div>
        ) : (
          Object.entries(groupedData).map(([partnerId, partner]: [string, any]) => {
            const isPartnerExpanded = expandedPartners.has(partnerId);
            return (
              <div key={partnerId} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Partner Header */}
                <button 
                  onClick={() => togglePartner(partnerId)}
                  className="w-full flex items-center gap-4 px-8 py-6 hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <User className="w-5 h-5 text-indigo-600 transition-colors group-hover:text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Parceiro responsável</p>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">
                      {partner.name}
                    </h2>
                    
                    {/* Partner Stats Summary */}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">A Vencer:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-100/50">{partner.stats.pendingCount}</span>
                          <span className="text-[10px] font-black text-slate-600 tracking-tight">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(partner.stats.pendingAmount)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Pagas:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100/50">{partner.stats.paidCount}</span>
                          <span className="text-[10px] font-black text-slate-600 tracking-tight">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(partner.stats.paidAmount)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Comissão:</span>
                        <div className="flex items-center gap-1">
                           <div className="w-4 h-4 bg-indigo-50 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-2.5 h-2.5 text-indigo-500" />
                          </div>
                          <span className="text-[10px] font-black text-indigo-600 tracking-tight">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(partner.stats.totalCommissions)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clientes</p>
                      <p className="text-sm font-black text-indigo-600">{Object.keys(partner.clients).length}</p>
                    </div>
                    {isPartnerExpanded ? <ChevronDown className="w-5 h-5 text-slate-300" /> : <ChevronRight className="w-5 h-5 text-slate-300" />}
                  </div>
                </button>

                {/* Clients under Partner */}
                {isPartnerExpanded && (
                  <div className="bg-slate-50/30 border-t border-slate-50 p-6 space-y-6">
                    {Object.entries(partner.clients).map(([clientId, client]: [string, any]) => {
                      const isClientExpanded = expandedClients.has(clientId);
                      return (
                        <div key={clientId} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
                          {/* Client Header */}
                          <button 
                            onClick={() => toggleClient(clientId)}
                            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors"
                          >
                            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-500" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cliente</p>
                              <h3 className="text-sm font-black text-slate-800 tracking-tight">
                                {client.name}
                              </h3>
                            </div>
                            {isClientExpanded ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                          </button>

                          {/* Deals under Client */}
                          {isClientExpanded && (
                            <div className="p-4 space-y-4 bg-slate-50/20 border-t border-slate-50">
                              {Object.entries(client.deals).map(([dealId, deal]: [string, any]) => (
                                <div key={dealId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                  {/* Deal Sub-header */}
                                  <div className="px-5 py-3.5 bg-slate-50/40 border-b border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        Negócio: <span className="text-slate-900">{deal.productName}</span>
                                      </span>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tabular-nums">
                                      ID: {dealId.substring(0, 8)}
                                    </span>
                                  </div>

                                  {/* Installments Table for this Deal */}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50/10 text-slate-400 font-bold text-[8px] uppercase tracking-widest border-b border-slate-50">
                                          <th className="px-5 py-2.5">Parcela</th>
                                          <th className="px-5 py-2.5 font-bold">Vencimento</th>
                                          <th className="px-5 py-2.5">Valor</th>
                                          <th className="px-5 py-2.5 text-center">Status</th>
                                          <th className="px-5 py-2.5 text-right">Ações</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {deal.installments.map((inst: Installment) => (
                                          <tr key={inst.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-5 py-3">
                                              <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                                {inst.label}
                                              </span>
                                            </td>
                                            <td className="px-5 py-3">
                                              <div className="flex items-center gap-2 text-slate-600 font-bold text-[9px] uppercase">
                                                <Calendar className="w-3 h-3 text-slate-300" />
                                                {new Date(inst.due_date).toLocaleDateString('pt-BR')}
                                              </div>
                                            </td>
                                            <td className="px-5 py-3">
                                              <span className="text-[11px] font-black text-slate-900 tabular-nums">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.value)}
                                              </span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                              <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                                inst.status === 'Pago' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                inst.status === 'Atrasado' || (new Date(inst.due_date) < new Date() && inst.status === 'Pendente') ? "bg-red-50 text-red-600 border-red-100" :
                                                "bg-amber-50 text-amber-600 border-amber-100"
                                              )}>
                                                {inst.status === 'Pendente' && new Date(inst.due_date) < new Date() ? 'Atrasada' : inst.status}
                                              </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                              {inst.status !== 'Pago' ? (
                                                  <div className="flex items-center justify-end gap-1">
                                                    {inst.payment_link && (
                                                      <>
                                                        <button 
                                                          onClick={() => {
                                                            navigator.clipboard.writeText(inst.payment_link!);
                                                            alert('Link copiado!');
                                                          }}
                                                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                                                          title="Copiar Link"
                                                        >
                                                          <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                        <a 
                                                          href={inst.payment_link} 
                                                          target="_blank" 
                                                          rel="noopener noreferrer"
                                                          className="p-1.5 text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                                                          title="Abrir Checkout InfinitePay"
                                                        >
                                                          <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                      </>
                                                    )}
                                                    <button 
                                                      onClick={() => {
                                                        setEditingInstallment(inst);
                                                        setIsEditModalOpen(true);
                                                      }}
                                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                      title="Editar Data"
                                                    >
                                                      <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                      onClick={() => handleFaturar(inst)}
                                                      className="px-2.5 py-1.5 bg-slate-900 text-white text-[8px] font-bold rounded-lg hover:bg-black transition-all uppercase tracking-widest flex items-center gap-1.5"
                                                    >
                                                      <TrendingUp className="w-3 h-3 text-indigo-400" />
                                                      Faturar
                                                    </button>
                                                  </div>
                                              ) : (
                                                <div className="flex items-center justify-end gap-1.5 text-emerald-500 font-black text-[8px] uppercase tracking-widest">
                                                  <CheckCircle2 className="w-3 h-3.5" />
                                                  Quitada
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingInstallment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Pencil className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">Editar Parcela</h3>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Ajuste os detalhes técnicos</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parcela</span>
                  <span className="text-xs font-bold text-slate-700">{editingInstallment.label}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</span>
                  <span className="text-xs font-black text-indigo-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(editingInstallment.value)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nova Data de Vencimento</label>
                <input 
                  type="date" 
                  value={editingInstallment.due_date ? editingInstallment.due_date.split('T')[0] : ''}
                  onChange={(e) => setEditingInstallment({ ...editingInstallment, due_date: new Date(e.target.value).toISOString() })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all shadow-sm"
                />
              </div>

              <div className="bg-amber-50 rounded-xl p-4 flex gap-3 border border-amber-100/50">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  A alteração da data afetará apenas esta parcela específica. O rótulo e o valor permanecem inalterados por segurança.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex-[2] py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-black shadow-lg shadow-indigo-500/10 transition-all uppercase tracking-widest text-[11px] active:scale-[0.98]"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
