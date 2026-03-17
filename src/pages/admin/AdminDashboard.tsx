import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Package, AlertCircle, Clock, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalParceiros: 0,
    totalClientes: 0,
    emNegociacao: 0,
    negociosFechados: 0,
    volumeVendas: 0,
    comissoesGeradas: 0,
    saquessPendentes: 0,
  });
  const [recentDeals, setRecentDeals] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Total de parceiros
      const { data: partners } = await supabase
        .from('profiles').select('id').eq('role', 'partner');

      // Total de clientes (leads)
      const { data: leads } = await supabase
        .from('leads').select('id');

      // Negócios da tabela lead_deals
      const { data: deals } = await supabase
        .from('lead_deals')
        .select(`
          id, status, value, created_at, partner_id, lead_id, product_id,
          leads (name),
          profiles:partner_id (full_name),
          products (name, commission_value, commission_direct, commission_lvl1, commission_lvl2)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const dealsArr = (deals as any[]) || [];
      const emNegociacao    = dealsArr.filter(d => d.status === 'Em Negociação').length;
      const negociosFechados = dealsArr.filter(d => d.status === 'Fechado').length;
      const volumeVendas    = dealsArr.filter(d => d.status === 'Fechado')
        .reduce((s: number, d: any) => s + Number(d.value), 0);

      // Comissões geradas (Créditos)
      const { data: comms } = await supabase.from('commissions').select('amount, status, type');
      const comissoesGeradas = ((comms as any[]) || [])
        .filter(c => c.type === 'credit')
        .reduce((s: number, c: any) => s + Number(c.amount), 0);
      
      const saquessPendentes = ((comms as any[]) || []).filter(c => c.status === 'Pendente').length;

      setStats({
        totalParceiros: partners?.length || 0,
        totalClientes: leads?.length || 0,
        emNegociacao,
        negociosFechados,
        volumeVendas,
        comissoesGeradas,
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

  const handleFaturar = async (deal: any) => {
    try {
      setLoading(true);
      
      if (!deal.partner_id) {
        alert('Erro: Este negócio não possui um parceiro associado e não pode ser faturado.');
        return;
      }

      // 0. Verificar se já não foi faturado
      const { data: existing } = await supabase
        .from('commissions')
        .select('id')
        .eq('deal_id', deal.id)
        .limit(1);

      if (existing && existing.length > 0) {
        alert('Este negócio já foi faturado anteriormente.');
        return;
      }

      // 1. Buscar o perfil do vendedor (dono do negócio) para pegar a árvore de referências
      const { data: seller, error: sellerError } = await supabase
        .from('profiles')
        .select('id, referred_by, full_name') // Added full_name for notes
        .eq('id', deal.partner_id)
        .single();

      if (sellerError) throw sellerError;

      const commissionsToInsert = [];

      // A. Comissão Direta (Vendedor)
      commissionsToInsert.push({
        partner_id: deal.partner_id,
        lead_id: deal.lead_id,
        deal_id: deal.id,
        product_id: deal.product_id,
        amount: deal.products?.commission_direct || deal.products?.commission_value || 0,
        status: 'Disponível',
        type: 'credit',
        notes: 'Venda Direta'
      });

      // B. Comissão Nível 1 (Indicador do Vendedor)
      if (seller.referred_by && deal.products?.commission_lvl1 > 0) {
        commissionsToInsert.push({
          partner_id: seller.referred_by,
          lead_id: deal.lead_id,
          deal_id: deal.id,
          product_id: deal.product_id,
          amount: deal.products.commission_lvl1,
          status: 'Disponível',
          type: 'credit',
          notes: `Indicação Lvl 1 (Venda de ${seller.full_name || 'Parceiro'})`
        });

        // C. Comissão Nível 2 (Indicador do Indicador)
        const { data: lvl1Partner } = await supabase
          .from('profiles')
          .select('referred_by')
          .eq('id', seller.referred_by)
          .single();

        if (lvl1Partner?.referred_by && deal.products?.commission_lvl2 > 0) {
          commissionsToInsert.push({
            partner_id: lvl1Partner.referred_by,
            lead_id: deal.lead_id,
            deal_id: deal.id,
            product_id: deal.product_id,
            amount: deal.products.commission_lvl2,
            status: 'Disponível',
            type: 'credit',
            notes: 'Indicação Lvl 2'
          });
        }
      }

      const { error: commError } = await supabase
        .from('commissions')
        .insert(commissionsToInsert);

      if (commError) throw commError;
      
      alert('Negócio faturado com sucesso em todos os níveis disponíveis!');
      fetchData();
    } catch (error: any) {
      console.error('Erro ao faturar:', error);
      alert('Erro ao faturar: ' + error.message);
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
    { label: 'Saques Pendentes',     value: stats.saquessPendentes.toString(), icon: AlertCircle,  color: 'text-red-600',    bg: 'bg-red-50' },
  ];

  const STATUS_STYLE: Record<string, string> = {
    'Fechado':        'bg-emerald-100 text-emerald-700',
    'Em Negociação':  'bg-amber-100 text-amber-700',
    'Lead':           'bg-blue-100 text-blue-700',
    'Perdido':        'bg-red-100 text-red-700',
  };

  const [dealSearch, setDealSearch] = useState('');

  const filteredDeals = recentDeals.filter(d => 
    (d.leads?.name || '').toLowerCase().includes(dealSearch.toLowerCase()) ||
    (d.products?.name || '').toLowerCase().includes(dealSearch.toLowerCase()) ||
    (d.profiles?.full_name || '').toLowerCase().includes(dealSearch.toLowerCase())
  );

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Visão Geral do Sistema</h1>
        <p className="text-slate-500 mt-1">Acompanhe o desempenho global da rede de parceiros.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={cn('p-3 rounded-lg', stat.bg)}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? <span className="animate-pulse">...</span> : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent deals */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Negócios Recentes da Rede</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, produto ou parceiro..."
              value={dealSearch}
              onChange={(e) => setDealSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full"
            />
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
                  <th className="px-6 py-4">Parceiro</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDeals.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{d.products?.name || '—'}</p>
                      <p className="text-xs text-slate-500">Cliente: {d.leads?.name || '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700">{d.profiles?.full_name || '—'}</p>
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
                      {(d.status?.toLowerCase() === 'fechado' || d.status?.toLowerCase() === 'vendido') && (
                        <button 
                          onClick={() => handleFaturar(d)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-shadow shadow-sm"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          FATURAR
                        </button>
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
