import { useState } from 'react';
import { Save, Percent, Award, Wallet, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

export function AdminSettings() {
  const [activeTab, setActiveTab] = useState('commissions');

  const tabs = [
    { id: 'commissions', label: 'Comissões e Níveis', icon: Percent },
    { id: 'financial', label: 'Financeiro e Saques', icon: Wallet },
    { id: 'security', label: 'Segurança', icon: ShieldCheck },
    { id: 'general', label: 'Geral', icon: SettingsIcon },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
          <p className="text-slate-500 mt-1">Defina as regras de negócio, comissionamento e parâmetros globais.</p>
        </div>
        <button className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
          <Save className="w-5 h-5 mr-2" />
          Salvar Alterações
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-indigo-600" : "text-slate-400")} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {activeTab === 'commissions' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Direct Commissions */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-indigo-600" />
                    Comissionamento Padrão
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Defina as porcentagens base para vendas diretas e rede.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Venda Direta (%)</label>
                      <div className="relative">
                        <input type="number" defaultValue={30} className="w-full border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      </div>
                      <p className="text-xs text-slate-500">Comissão para quem realizou a venda.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Rede - Nível 1 (%)</label>
                      <div className="relative">
                        <input type="number" defaultValue={10} className="w-full border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      </div>
                      <p className="text-xs text-slate-500">Comissão para o indicador direto.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Rede - Nível 2 (%)</label>
                      <div className="relative">
                        <input type="number" defaultValue={5} className="w-full border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      </div>
                      <p className="text-xs text-slate-500">Comissão para o indicador do indicador.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Rede - Nível 3 (%)</label>
                      <div className="relative">
                        <input type="number" defaultValue={2} className="w-full border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Partner Levels */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      Níveis de Parceiros (Gamificação)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Regras para evolução de nível na plataforma.</p>
                  </div>
                  <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Adicionar Nível</button>
                </div>
                <div className="p-6 space-y-6">
                  {/* Level 1 */}
                  <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Nível 1: Afiliado</h3>
                      <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2 py-1 rounded">Padrão</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Requisito: Vendas Mínimas</label>
                        <input type="number" defaultValue={0} disabled className="w-full border border-slate-200 rounded-md px-3 py-2 bg-slate-100 text-slate-500 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Bônus de Comissão (%)</label>
                        <input type="number" defaultValue={0} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white" />
                      </div>
                    </div>
                  </div>

                  {/* Level 2 */}
                  <div className="p-4 border border-indigo-100 rounded-lg bg-indigo-50/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-indigo-900">Nível 2: Premium</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Requisito: Vendas Mínimas (R$)</label>
                        <input type="number" defaultValue={10000} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Bônus de Comissão (%)</label>
                        <input type="number" defaultValue={5} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                    Regras de Saque
                  </h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Valor Mínimo para Saque (R$)</label>
                      <input type="number" defaultValue={100} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Taxa de Saque (R$)</label>
                      <input type="number" defaultValue={0} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                      <p className="text-xs text-slate-500">Custo fixo descontado do parceiro por saque.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Prazo de Liberação (Dias)</label>
                      <input type="number" defaultValue={30} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                      <p className="text-xs text-slate-500">Dias após a venda para o saldo ficar disponível (Garantia).</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 text-center">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Configurações de Segurança</h3>
                <p className="text-slate-500 mt-2">Em breve: Autenticação em duas etapas (2FA), logs de acesso e restrições de IP.</p>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Informações da Plataforma</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nome da Empresa / Plataforma</label>
                    <input type="text" defaultValue="Impulsione Consultoria" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">E-mail de Suporte</label>
                    <input type="email" defaultValue="suporte@impulsione.com" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
