import { Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const stats = [
  { label: 'Total de Parceiros', value: '1.248', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Receita Total (Mês)', value: 'R$ 145.000', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Comissões Pagas', value: 'R$ 42.500', icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Saques Pendentes', value: '12', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
];

export function AdminDashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Visão Geral do Sistema</h1>
        <p className="text-slate-500 mt-1">Acompanhe o desempenho global da sua rede de parceiros.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-lg", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimos Parceiros Cadastrados</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                    P{i}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Parceiro Exemplo {i}</p>
                    <p className="text-xs text-slate-500">parceiro{i}@email.com</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Novo</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimas Vendas da Rede</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">Plano Premium</p>
                  <p className="text-xs text-slate-500">Vendido por: Parceiro {i}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">R$ 1.200,00</p>
                  <p className="text-xs text-indigo-600 font-medium">Comissão: R$ 120,00</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
