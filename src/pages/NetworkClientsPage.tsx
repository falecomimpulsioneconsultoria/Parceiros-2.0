import React, { useState, useEffect } from 'react';
import { Users, Search, ChevronDown, ChevronRight, TrendingUp, Clock, PlayCircle, PauseCircle, CheckCircle, CheckCircle2, XCircle, Info, ExternalLink, Package, DollarSign } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  profiles?: { full_name: string, email: string } | null;
  lead_deals?: LeadDeal[];
};

type LeadDeal = Database['public']['Tables']['lead_deals']['Row'] & {
  products?: { name: string } | null;
  lead_name?: string;
  lead_id?: string;
  partner_id?: string;
};

const STATUS_STYLE: Record<string, string> = {
  'Fechado':       'bg-emerald-100 text-emerald-700',
  'Em Negociação': 'bg-amber-100 text-amber-700',
  'Lead':          'bg-blue-100 text-blue-700',
  'Perdido':       'bg-red-100 text-red-700',
};

const EXECUTION_STATUS_STYLE: Record<string, { color: string, icon: any }> = {
  'A iniciar':    { color: 'bg-slate-100 text-slate-700',   icon: Clock },
  'Em andamento': { color: 'bg-blue-100 text-blue-700',    icon: PlayCircle },
  'Pendenciado':  { color: 'bg-amber-100 text-amber-700',   icon: PauseCircle },
  'Concluido':    { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  'Cancelado':    { color: 'bg-red-100 text-red-700',      icon: XCircle },
};

type KanbanStage = { id: string; name: string; color: string; };

export function NetworkClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [networkLeads, setNetworkLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [dealInstallments, setDealInstallments] = useState<Record<string, any[]>>({});
  const [loadingInstallments, setLoadingInstallments] = useState<Record<string, boolean>>({});
  const { user } = useAuth();

  const stages: KanbanStage[] = [
    { id: 'Lead', name: 'Lead', color: '#3b82f6' },
    { id: 'Em Negociação', name: 'Em Negociação', color: '#f59e0b' },
    { id: 'Fechado', name: 'Fechado', color: '#10b981' },
    { id: 'Perdido', name: 'Perdido', color: '#ef4444' }
  ];

  useEffect(() => {
    if (user) loadNetworkData();
  }, [user]);

  const loadNetworkData = async () => {
    setLoading(true);
    try {
      const { data: networkPartners } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', user?.id)
        .eq('role', 'partner');

      if (networkPartners && networkPartners.length > 0) {
        const networkPartnerIds = networkPartners.map((p: any) => p.id);
        const { data: networkLeadsData, error } = await supabase
          .from('leads')
          .select(`
            *,
            profiles (full_name, email),
            lead_deals (
              id, status, value, product_id, created_at,
              execution_status, pending_description, pending_document_url,
              products (name)
            )
          `)
          .in('partner_id', networkPartnerIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNetworkLeads((networkLeadsData as Lead[]) || []);
      } else {
        setNetworkLeads([]);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes da rede:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstallments = async (dealId: string) => {
    setLoadingInstallments(prev => ({ ...prev, [dealId]: true }));
    try {
      const { data, error } = await supabase
        .from('deal_installments')
        .select('*')
        .eq('deal_id', dealId)
        .order('installment_number', { ascending: true });

      if (error) throw error;
      setDealInstallments(prev => ({ ...prev, [dealId]: data || [] }));
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error);
    } finally {
      setLoadingInstallments(prev => ({ ...prev, [dealId]: false }));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
        const client = networkLeads.find(l => l.id === id);
        client?.lead_deals?.forEach(d => {
          if (d.status === 'Fechado') {
            loadInstallments(d.id);
          }
        });
      }
      return s;
    });
  };

  const filteredNetworkLeads = React.useMemo(() => {
    return networkLeads.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [networkLeads, searchTerm]);

  const allDeals = React.useMemo(() => {
    return networkLeads.flatMap(lead =>
      (lead.lead_deals || []).map(deal => ({
        ...deal,
        lead_name: lead.name,
        lead_id: lead.id,
        partner_id: lead.partner_id
      }))
    ).filter(deal =>
      deal.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deal.products?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [networkLeads, searchTerm]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-medium">Carregando dados da rede...</p>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clientes da Minha Rede</h1>
            <p className="text-slate-500 mt-0.5 text-sm">Acompanhe os clientes e negócios cadastrados pelos parceiros que você indicou.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1 shadow-sm border border-slate-200">
            <button onClick={() => setViewMode('list')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                viewMode === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}>Lista</button>
            <button onClick={() => setViewMode('kanban')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                viewMode === 'kanban' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}>Kanban</button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar na rede..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full bg-white shadow-sm transition-all"
              />
            </div>
            <span className="text-xs font-medium text-slate-400">{filteredNetworkLeads.length} clientes</span>
          </div>

          {filteredNetworkLeads.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-900 font-semibold text-lg">Nenhum cliente encontrado</h3>
              <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm leading-relaxed">
                Os clientes dos parceiros que você indicou aparecerão aqui automaticamente assim que forem cadastrados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest w-12"></th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Parceiro</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Negócios</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Data</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNetworkLeads.map((client) => {
                    const deals = client.lead_deals || [];
                    const isExpanded = expandedRows.has(client.id);
                    return (
                      <React.Fragment key={client.id}>
                        <tr className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleExpand(client.id)}
                              className="p-1.5 hover:bg-white rounded-lg transition-colors shadow-sm border border-transparent hover:border-slate-200"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900 text-sm">{client.name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{client.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-slate-600 font-medium">{client.profiles?.full_name || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-1.5">
                                {deals.slice(0, 2).map((d, i) => (
                                  <div key={i} title={d.products?.name || 'Produto'}
                                    className="w-6 h-6 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[9px] font-bold text-indigo-600 shadow-sm">
                                    {d.products?.name?.charAt(0) || 'P'}
                                  </div>
                                ))}
                              </div>
                              {deals.length > 2 && (
                                <span className="text-[10px] text-slate-400">+{deals.length - 2} mais</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {new Date(client.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              <Clock className="w-3 h-3" /> Somente Leitura
                            </span>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="border-b border-slate-100 bg-indigo-50/30">
                            <td colSpan={6} className="px-6 py-3">
                              {deals.length === 0 ? (
                                <p className="text-xs text-slate-400 py-2 text-center italic">Este cliente ainda não tem negócios.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-200/50">
                                        <th className="px-3 py-2 text-left">Produto</th>
                                        <th className="px-3 py-2 text-left">Status Comercial</th>
                                        <th className="px-3 py-2 text-left">Execução</th>
                                        <th className="px-3 py-2 text-right">Valor</th>
                                        <th className="px-3 py-2 text-left">Data</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/50">
                                      {deals.map((deal: any) => (
                                        <React.Fragment key={deal.id}>
                                          <tr className="hover:bg-white/50 transition-colors">
                                            <td className="px-3 py-2.5 font-bold text-slate-700 flex items-center gap-2">
                                              <Package className="w-3.5 h-3.5 text-indigo-400" />
                                              {deal.products?.name || '—'}
                                            </td>
                                            <td className="px-3 py-2.5">
                                              <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                STATUS_STYLE[deal.status] || 'bg-slate-100 text-slate-700'
                                              )}>
                                                {deal.status}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                              <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                                                  EXECUTION_STATUS_STYLE[deal.execution_status || 'A iniciar']?.color || 'bg-slate-50 text-slate-500 border-slate-200'
                                                )}>
                                                  {(() => {
                                                    const Icon = EXECUTION_STATUS_STYLE[deal.execution_status || 'A iniciar']?.icon || Clock;
                                                    return <Icon className="w-3 h-3" />;
                                                  })()}
                                                  {deal.execution_status || 'A iniciar'}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-extrabold text-slate-900">
                                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-400 font-medium">
                                              {new Date(deal.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                          </tr>
                                          {/* Sub-tabela de Parcelas */}
                                          {deal.status === 'Fechado' && (
                                            <tr>
                                              <td colSpan={5} className="px-8 py-2 bg-indigo-50/50">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                                                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Cronograma de Parcelas</span>
                                                </div>
                                                
                                                {loadingInstallments[deal.id] ? (
                                                  <div className="flex items-center gap-2 py-2 text-[10px] text-slate-400 italic">
                                                    <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                                    Carregando parcelas...
                                                  </div>
                                                ) : !dealInstallments[deal.id] || dealInstallments[deal.id].length === 0 ? (
                                                  <div className="py-2 text-[10px] text-slate-400 italic">Este negócio não possui parcelas geradas (Venda à Vista).</div>
                                                ) : (
                                                  <div className="bg-white/80 rounded-xl border border-indigo-100 overflow-hidden shadow-sm">
                                                    <table className="w-full text-[10px]">
                                                      <thead className="bg-indigo-50/50 text-indigo-400 font-bold uppercase tracking-tighter border-b border-indigo-100">
                                                        <tr>
                                                          <th className="px-3 py-2 text-left">Parcela</th>
                                                          <th className="px-3 py-2 text-left">Vencimento</th>
                                                          <th className="px-3 py-2 text-right">Valor</th>
                                                          <th className="px-3 py-2 text-center">Status</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-indigo-50/50">
                                                        {dealInstallments[deal.id].map((inst: any) => (
                                                          <tr key={inst.id} className="hover:bg-white transition-colors">
                                                            <td className="px-3 py-2 font-bold text-slate-700">{inst.label}</td>
                                                            <td className="px-3 py-2 text-slate-500">
                                                              {inst.due_date ? new Date(inst.due_date).toLocaleDateString('pt-BR') : '—'}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-bold text-slate-900">
                                                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.value)}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                              <span className={cn(
                                                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                                inst.status === 'Pago' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                                              )}>
                                                                {inst.status === 'Pago' ? 'Quitado' : 'Pendente'}
                                                              </span>
                                                            </td>
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
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Kanban de Negócios da Rede <span className="ml-2 text-sm font-normal text-slate-400">({allDeals.length})</span>
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
                  <div className="p-3 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{stage.name}</h3>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{stageDeals.length}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                      <DollarSign className="w-3 h-3 text-slate-400" />
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        stageDeals.reduce((sum, d) => sum + (parseFloat(String(d.value)) || 0), 0)
                      )}
                    </div>
                  </div>

                  <div className="p-2 space-y-3 overflow-y-auto">
                    {stageDeals.map(deal => (
                      <div key={deal.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">{deal.lead_name}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Package className="w-3.5 h-3.5" />
                            <span className="line-clamp-1">{deal.products?.name || 'Sem Produto'}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border",
                              EXECUTION_STATUS_STYLE[deal.execution_status || 'A iniciar']?.color || 'bg-slate-50 text-slate-500 border-slate-200')}>
                              {(() => {
                                const Icon = EXECUTION_STATUS_STYLE[deal.execution_status || 'A iniciar']?.icon || Clock;
                                return <Icon className="w-2.5 h-2.5" />;
                              })()}
                              {deal.execution_status || 'A iniciar'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-slate-800">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
                            </span>
                          </div>

                          <div className="pt-1">
                            {deal.status === 'Fechado' ? (
                              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-50 border border-emerald-100 rounded text-[10px] font-bold text-emerald-700 uppercase leading-none">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Venda Concluída
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-400 uppercase leading-none">
                                <Clock className="w-3 h-3" />
                                Somente Leitura
                              </div>
                            )}
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
    </div>
  );
}
