import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Package, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    clientesAtivos: 0,
    comissoesMes: 0,
    parceirosRede: 0,
    produtosVendidos: 0,
    emNegociacao: 0,
    valorFechado: 0,
  });
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch user profile to get referred_by
      const { data: profileData } = await supabase
        .from('profiles')
        .select(`
          full_name,
          email,
          referred_by,
          referrer:profiles!referred_by(full_name, email)
        `)
        .eq('id', user?.id)
        .single();

      // @ts-ignore
      setPartnerName(profileData?.full_name || profileData?.email || '');

      if (profileData?.referrer) {
        // @ts-ignore
        setReferredBy(profileData.referrer.full_name || profileData.referrer.email);
      }

      // Total de clientes (leads únicos do parceiro)
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id')
        .eq('partner_id', user?.id);

      const clientesAtivos = leadsData?.length || 0;

      // Negócios fechados e valor total — da nova tabela lead_deals
      const { data: dealsData } = await supabase
        .from('lead_deals')
        .select('status, value')
        .eq('partner_id', user?.id);

      const deals = (dealsData as any[]) || [];
      const produtosVendidos = deals.filter(d => d.status === 'Fechado').length;
      const emNegociacao = deals.filter(d => d.status === 'Em Negociação').length;
      const valorFechado = deals.filter(d => d.status === 'Fechado')
        .reduce((acc: number, d: any) => acc + Number(d.value), 0) || 0;

      // Fetch commissions
      const { data: commData } = await supabase
        .from('commissions')
        .select('*')
        .eq('partner_id', user?.id);

      const comissoesMes = (commData as any[])?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      // Fetch network
      const { data: networkData } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', user?.id);

      const parceirosRede = networkData?.length || 0;

      setStats({
        clientesAtivos,
        comissoesMes,
        parceirosRede,
        produtosVendidos,
        emNegociacao,
        valorFechado,
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const statCards = [
    { name: 'Total de Clientes', value: stats.clientesAtivos.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Em Negociação', value: stats.emNegociacao.toString(), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Negócios Fechados', value: stats.produtosVendidos.toString(), icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Volume de Vendas', value: fmt(stats.valorFechado), icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Comissões Geradas', value: fmt(stats.comissoesMes), icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50' },
    { name: 'Parceiros na Rede', value: stats.parceirosRede.toString(), icon: UserPlus, color: 'text-sky-600', bg: 'bg-sky-50' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {partnerName ? (
              <>Olá, <span className="text-indigo-600">{partnerName.split(' ')[0]}</span>! 👋</>
            ) : (
              'Visão Geral'
            )}
          </h1>
          <p className="text-slate-500 mt-1">Acompanhe seus resultados e de sua rede de parceiros.</p>
        </div>
        {referredBy && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-900">
              Indicado por: <span className="font-bold">{referredBy}</span>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {loading ? '...' : stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder for more dashboard content */}
      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col items-center justify-center">
          <TrendingUp className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-400 font-medium">Gráfico de Vendas</p>
          <p className="text-slate-400 text-sm mt-1">Disponível em breve</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col items-center justify-center">
          <Users className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-400 font-medium">Atividade da Rede</p>
          <p className="text-slate-400 text-sm mt-1">Disponível em breve</p>
        </div>
      </div>
    </div>
  );
}
