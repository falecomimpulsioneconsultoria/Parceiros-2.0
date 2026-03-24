import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Package, AlertCircle, Clock, Search, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [dateStart, setDateStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({
    totalParceiros: 0,
    totalClientes: 0,
    emNegociacao: 0,
    negociosFechados: 0,
    volumeVendas: 0,
    comissoesGeradas: 0,
    comissoesPagas: 0,
    comissoesAPagar: 0,
    saquessPendentes: 0,
  });
  const [recentDeals, setRecentDeals] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [dateStart, dateEnd]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [partnersRes, leadsRes, dealsRes, commsRes] = await Promise.all([
        supabase.from('profiles').select('id').eq('role', 'partner').gte('created_at', dateStart).lte('created_at', `${dateEnd}T23:59:59`),
        supabase.from('leads').select('id').gte('created_at', dateStart).lte('created_at', `${dateEnd}T23:59:59`),
        supabase.from('lead_deals').select(`
          id, status, value, created_at, partner_id, lead_id, product_id, partner_role,
          leads (name),
          profiles:partner_id (full_name),
          products (name, payment_type, commission_value, commission_direct, commission_lvl1, commission_lvl2, commission_captador, commission_indicator),
          deal_installments (status)
        `).gte('created_at', dateStart).lte('created_at', `${dateEnd}T23:59:59`).order('created_at', { ascending: false }),
        supabase.from('commissions').select('amount, status, type').gte('created_at', dateStart).lte('created_at', `${dateEnd}T23:59:59`)
      ]);

      const partners = partnersRes.data;
      const leads = leadsRes.data;
      const dealsArr = (dealsRes.data as any[]) || [];
      const comms = commsRes.data;

      const emNegociacao    = dealsArr.filter(d => d.status === 'Em Negociação').length;
      const negociosFechados = dealsArr.filter(d => d.status === 'Fechado').length;
      const volumeVendas    = dealsArr.filter(d => d.status === 'Fechado')
        .reduce((s: number, d: any) => s + Number(d.value), 0);

      const comissoesGeradas = ((comms as any[]) || [])
        .filter(c => c.type === 'credit')
        .reduce((s: number, c: any) => s + Number(c.amount), 0);
      
      const comissoesPagas = ((comms as any[]) || [])
        .filter(c => c.type === 'credit' && c.status === 'Pago')
        .reduce((s: number, c: any) => s + Number(c.amount), 0);

      const comissoesAPagar = ((comms as any[]) || [])
        .filter(c => c.type === 'credit' && (c.status === 'Disponível' || c.status === 'Pendente'))
        .reduce((s: number, c: any) => s + Number(c.amount), 0);
      
      const saquessPendentes = ((comms as any[]) || []).filter(c => c.status === 'Pendente').length;

      setStats({
        totalParceiros: partners?.length || 0,
        totalClientes: leads?.length || 0,
        emNegociacao,
        negociosFechados,
        volumeVendas,
        comissoesGeradas,
        comissoesPagas,
        comissoesAPagar,
        saquessPendentes,
      });

      // Últimos negócios (sem limite agressivo de 5)
      setRecentDeals(dealsArr);
    } catch (error) {
      console.error('Erro ao buscar dados do admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  };



  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const statCards = [
    { label: 'Total de Parceiros',   value: stats.totalParceiros.toString(),   icon: Users,        color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Total de Clientes',    value: stats.totalClientes.toString(),    icon: Users,        color: 'text-slate-600',  bg: 'bg-slate-100' },
    { label: 'Em Negociação',        value: stats.emNegociacao.toString(),     icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-50' },
    { label: 'Negócios Fechados',    value: stats.negociosFechados.toString(), icon: Package,      color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { label: 'Volume de Vendas',     value: fmt(stats.volumeVendas),           icon: TrendingUp,   color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Comissões Geradas',    value: fmt(stats.comissoesGeradas),       icon: DollarSign,   color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Comissões a Pagar',    value: fmt(stats.comissoesAPagar),        icon: Clock,        color: 'text-rose-600',   bg: 'bg-rose-50' },
    { label: 'Comissões Pagas',      value: fmt(stats.comissoesPagas),         icon: CheckCircle2, color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { label: 'Saques Pendentes',     value: stats.saquessPendentes.toString(), icon: AlertCircle,  color: 'text-red-600',    bg: 'bg-red-50' },
  ];

  const STATUS_STYLE: Record<string, string> = {
    'Fechado':        'bg-emerald-100 text-emerald-700',
    'Em Negociação':  'bg-amber-100 text-amber-700',
    'Lead':           'bg-blue-100 text-blue-700',
    'Perdido':        'bg-red-100 text-red-700',
  };

  const [dealSearch, setDealSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');
  const [filterRole, setFilterRole] = useState<'all' | string>('all');

  const filteredDeals = recentDeals.filter(d => {
    const searchMatch = 
      (d.leads?.name || '').toLowerCase().includes(dealSearch.toLowerCase()) ||
      (d.products?.name || '').toLowerCase().includes(dealSearch.toLowerCase()) ||
      (d.profiles?.full_name || '').toLowerCase().includes(dealSearch.toLowerCase());
    
    const statusMatch = filterStatus === 'all' || d.status === filterStatus;
    const roleMatch = filterRole === 'all' || (d.partner_role || 'Vendedor') === filterRole;
    
    return searchMatch && statusMatch && roleMatch;
  });

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      <div className="mb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral do Sistema</h1>
          <p className="text-slate-500 mt-1">Acompanhe o desempenho global da rede de parceiros.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase ml-2">Período:</span>
            <input 
              type="date" 
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="text-sm font-medium border-none focus:ring-0 p-1 rounded hover:bg-slate-50 transition-colors"
            />
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <input 
            type="date" 
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="text-sm font-medium border-none focus:ring-0 p-1 rounded hover:bg-slate-50 transition-colors"
          />
        </div>
      </div>

      {message && (
        <div className={cn(
          "mb-6 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9 gap-4">
        {statCards.map((stat) => (
          <div 
            key={stat.label} 
            className="bg-white p-4 2xl:p-3 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:border-indigo-200 hover:shadow-md group flex 2xl:flex-col items-center 2xl:items-start gap-4 2xl:gap-2"
          >
            <div className={cn('p-2.5 rounded-lg transition-transform duration-300 group-hover:scale-110 shrink-0', stat.bg)}>
              <stat.icon className={cn('w-5 h-5', stat.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight truncate">{stat.label}</p>
              <p className="text-lg 2xl:text-[15px] font-black text-slate-900 mt-0.5 truncate">
                {loading ? <span className="animate-pulse">...</span> : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent deals */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Negócios Recentes da Rede</h2>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar cliente, produto ou parceiro..."
                value={dealSearch}
                onChange={(e) => setDealSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white min-w-[140px] w-full sm:w-auto"
            >
              <option value="all">Todos Status</option>
              <option value="Fechado">Fechado</option>
              <option value="Vendido">Vendido</option>
              <option value="Em Negociação">Em Negociação</option>
              <option value="Lead">Lead</option>
              <option value="Perdido">Perdido</option>
            </select>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white min-w-[140px] w-full sm:w-auto"
            >
              <option value="all">Todos Papéis</option>
              <option value="Vendedor">Vendedor</option>
              <option value="Captador">Captador</option>
              <option value="Indicador">Indicador</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="py-12 text-center text-slate-400">Carregando negócios...</div>
        ) : filteredDeals.length === 0 ? (
          <div className="py-12 text-center text-slate-400">Nenhum negócio encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Produto / Cliente</th>
                  <th className="px-6 py-4">Parceiro / Papel</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDeals.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-900">{d.products?.name || '—'}</p>
                        {d.products?.payment_type && (
                          <span className={cn(
                            "text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                            d.products.payment_type === 'parcelado' ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"
                          )}>
                            {d.products.payment_type === 'parcelado' ? 'Parcelado' : 'À Vista'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">Cliente: {d.leads?.name || '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-medium">{d.profiles?.full_name || '—'}</p>
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {d.partner_role || 'Vendedor'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider', STATUS_STYLE[d.status] || 'bg-slate-100 text-slate-700')}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {fmt(d.value)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {d.products?.payment_type === 'parcelado' && d.status === 'Fechado' && d.deal_installments ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Status Parcelas</span>
                          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[11px] font-bold text-emerald-700">
                                {d.deal_installments.filter((i: any) => i.status?.toLowerCase() === 'pago').length}
                              </span>
                            </div>
                            <div className="w-px h-2.5 bg-slate-300" />
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-bold text-slate-600">
                                {d.deal_installments.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase italic">Sem parcelas</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
