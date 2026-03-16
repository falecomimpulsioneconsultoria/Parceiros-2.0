import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Package, AlertCircle, Clock } from 'lucide-react';
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
          id, status, value, created_at,
          leads (name),
          profiles:partner_id (full_name),
          products (name, commission_value)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const dealsArr = (deals as any[]) || [];
      const emNegociacao    = dealsArr.filter(d => d.status === 'Em Negociação').length;
      const negociosFechados = dealsArr.filter(d => d.status === 'Fechado').length;
      const volumeVendas    = dealsArr.filter(d => d.status === 'Fechado')
        .reduce((s: number, d: any) => s + Number(d.value), 0);

      // Comissões geradas
      const { data: comms } = await supabase.from('commissions').select('amount, status');
      const comissoesGeradas = ((comms as any[]) || []).reduce((s: number, c: any) => s + Number(c.amount), 0);
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

      // Últimos 5 negócios
      setRecentDeals(dealsArr.slice(0, 5));
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
    { label: 'Saques Pendentes',     value: stats.saquessPendentes.toString(), icon: AlertCircle,  color: 'text-red-600',    bg: 'bg-red-50' },
  ];

  const STATUS_STYLE: Record<string, string> = {
    'Fechado':        'bg-emerald-100 text-emerald-700',
    'Em Negociação':  'bg-amber-100 text-amber-700',
    'Lead':           'bg-blue-100 text-blue-700',
    'Perdido':        'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimos Negócios da Rede</h2>
        {loading ? (
          <div className="py-8 text-center text-slate-400">Carregando...</div>
        ) : recentDeals.length === 0 ? (
          <div className="py-8 text-center text-slate-400">Nenhum negócio registrado ainda.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentDeals.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{d.products?.name || '—'}</p>
                  <p className="text-xs text-slate-500">
                    Cliente: <span className="font-medium">{d.leads?.name || '—'}</span>
                    {' · '}
                    Parceiro: <span className="font-medium">{d.profiles?.full_name || '—'}</span>
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLE[d.status] || 'bg-slate-100 text-slate-700')}>
                    {d.status}
                  </span>
                  <p className="text-sm font-bold text-slate-900">{fmt(d.value)}</p>
                  {d.status === 'Fechado' && d.products?.commission_value > 0 && (
                    <p className="text-xs text-violet-600 font-medium">Comissão: {fmt(d.products.commission_value)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
