import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Package, UserPlus, Award, Zap, ChevronRight } from 'lucide-react';
import { Skeleton } from '@mui/material';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export function Dashboard() {
  const { user, role, partnerType: authPartnerType } = useAuth();
  const isAdmin = role === 'admin';
  const isVendedor = role === 'partner' && authPartnerType?.toLowerCase() === 'vendedor';
  const showNetwork = isAdmin || isVendedor;
  const isPartner = role === 'partner';
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
  const [partnerType, setPartnerType] = useState<string>('');
  const [userLevel, setUserLevel] = useState<string>('Afiliado');

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch user profile to get referred_by and level
       const { data: profileData } = await supabase
         .from('profiles')
         .select(`
           full_name,
           email,
            referred_by,
            level,
            partner_type,
            referrer:profiles!referred_by(full_name, email)
         `)
         .eq('id', user?.id)
         .single();
 
        // @ts-ignore
        setPartnerName(profileData?.full_name || profileData?.email || '');
        setPartnerType(profileData?.partner_type || '');
        setUserLevel(profileData?.level || 'Afiliado');

      if (profileData?.referrer) {
        // @ts-ignore
        setReferredBy(profileData.referrer.full_name || profileData.referrer.email);
      }

      // Total de clientes (leads únicos do parceiro)
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id')
        .or(`partner_id.eq.${user?.id},captador_id.eq.${user?.id}`);

      const clientesAtivos = leadsData?.length || 0;

      // Negócios fechados e valor total — da nova tabela lead_deals
      const { data: dealsData } = await supabase
        .from('lead_deals')
        .select('status, value')
        .or(`partner_id.eq.${user?.id},captador_id.eq.${user?.id}`);

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
    ...(showNetwork ? [{ name: 'Parceiros na Rede', value: stats.parceirosRede.toString(), icon: UserPlus, color: 'text-sky-600', bg: 'bg-sky-50' }] : []),
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {partnerName ? (
                <>Olá, <span className="text-indigo-600">{partnerName.split(' ')[0]}</span>! 👋</>
              ) : (
                'Visão Geral'
              )}
            </h1>
            {partnerType && (
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border shadow-sm",
                partnerType.toLowerCase() === 'vendedor' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
              )}>
                {partnerType}
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1">
            {isPartner ? 'Acompanhe seus resultados e performance comercial.' : 'Acompanhe seus resultados e de sua rede de parceiros.'}
          </p>
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
                  {loading ? <Skeleton width="60%" /> : stat.value}
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

      {/* Gamificação / Nível de Carreira */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center bg-gradient-to-br from-white to-slate-50">
          <div className="flex-shrink-0 relative">
            <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 rotate-3 transition-transform hover:rotate-0 duration-500">
              <Award className="w-12 h-12" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-amber-400 text-amber-900 text-[10px] font-black px-2 py-1 rounded-lg shadow-sm uppercase tracking-tighter border-2 border-white">
              Lvl {userLevel === 'Afiliado' ? '1' : userLevel === 'Premium' ? '2' : '3'}
            </div>
          </div>
          
          <div className="flex-1 space-y-4 w-full text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">Seu Plano de Carreira</span>
                {userLevel === 'Premium' && <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded">Membro Elite</span>}
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase">Nível atual: {loading ? <Skeleton width={120} sx={{ display: 'inline-block' }} /> : <span className="text-indigo-600">{userLevel}</span>}</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">
                {userLevel === 'Afiliado' 
                  ? 'Você está no nível inicial. Aumente seu volume de vendas para se tornar Premium.' 
                  : userLevel === 'Premium' 
                    ? 'Parabéns! Você é um parceiro Premium. Continue crescendo para o nível Master.'
                    : 'Você atingiu o topo! Você é um parceiro Master.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-slate-400">
                  {userLevel === 'Master' ? 'Nível Máximo Atingido' : `Progresso para ${userLevel === 'Afiliado' ? 'Premium (R$ 10k)' : 'Master (R$ 50k)'}`}
                </span>
                <span className="text-indigo-600">
                  {userLevel === 'Master' ? '100%' : `${Math.min(100, Math.round((stats.valorFechado / (userLevel === 'Afiliado' ? 10000 : 50000)) * 100))}%`}
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                <div 
                  className={cn(
                    "h-full bg-indigo-600 rounded-full shadow-sm transition-all duration-1000 ease-out relative group",
                    loading && "animate-pulse bg-slate-200"
                  )}
                  style={{ width: loading ? '100%' : `${userLevel === 'Master' ? 100 : Math.min(100, (stats.valorFechado / (userLevel === 'Afiliado' ? 10000 : 50000)) * 100)}%` }}
                >
                  <div className="absolute top-0 right-0 h-full w-8 bg-white/20 skew-x-12 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>{loading ? <Skeleton width={60} /> : `${fmt(stats.valorFechado)} acumulados`}</span>
                <span>Alvo: {loading ? <Skeleton width={80} /> : (userLevel === 'Afiliado' ? 'R$ 10.000,00' : userLevel === 'Premium' ? 'R$ 50.000,00' : 'Meta Master Batida!')}</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block w-px h-24 bg-slate-200 mx-4"></div>

          <div className="w-full md:w-fit space-y-3">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:border-indigo-200 transition-colors group cursor-default">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Bônus Atual</p>
                  <p className="text-sm font-bold text-slate-900">{userLevel === 'Afiliado' ? 'Comissões Padrão' : userLevel === 'Premium' ? '+2% de Recorrência' : '+5% de Recorrência'}</p>
                </div>
              </div>
            </div>
            {userLevel !== 'Master' && (
              <button className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all group font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-200">
                Como subir de nível?
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={cn("grid gap-6 mt-8", !showNetwork ? "grid-cols-1" : "lg:grid-cols-2")}>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col items-center justify-center">
          <TrendingUp className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-400 font-medium">Gráfico de Vendas</p>
          <p className="text-slate-400 text-sm mt-1">Disponível em breve</p>
        </div>
        {showNetwork && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col items-center justify-center">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-400 font-medium">Atividade da Rede</p>
            <p className="text-slate-400 text-sm mt-1">Disponível em breve</p>
          </div>
        )}
      </div>
    </div>
  );
}
