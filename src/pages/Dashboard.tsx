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
  });
  const [referredBy, setReferredBy] = useState<string | null>(null);

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
          referred_by,
          referrer:profiles!referred_by(full_name, email)
        `)
        .eq('id', user?.id)
        .single();

      if (profileData?.referrer) {
        // @ts-ignore
        setReferredBy(profileData.referrer.full_name || profileData.referrer.email);
      }

      // Fetch leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('partner_id', user?.id);

      const clientesAtivos = leadsData?.length || 0;
      const produtosVendidos = (leadsData as any[])?.filter(l => l.status === 'Fechado').length || 0;

      // Fetch commissions
      const { data: commData } = await supabase
        .from('commissions')
        .select('*')
        .eq('partner_id', user?.id);

      // Sum commissions (you can filter by month if needed)
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
        produtosVendidos
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { name: 'Total de Clientes', value: stats.clientesAtivos.toString(), icon: Users },
    { name: 'Comissões Geradas', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.comissoesMes), icon: DollarSign },
    { name: 'Parceiros na Rede', value: stats.parceirosRede.toString(), icon: TrendingUp },
    { name: 'Negócios Fechados', value: stats.produtosVendidos.toString(), icon: Package },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {loading ? '...' : stat.value}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <stat.icon className="w-6 h-6 text-indigo-600" />
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
