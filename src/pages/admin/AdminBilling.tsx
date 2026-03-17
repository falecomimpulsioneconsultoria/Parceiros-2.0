import React, { useState, useEffect } from 'react';
import { DollarSign, Search, Filter, Download, ArrowUpRight, Clock, CheckCircle2, User, Package, Calendar, TrendingUp, Wallet, Receipt } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Commission = Database['public']['Tables']['commissions']['Row'] & {
  profiles?: { full_name: string; email: string } | null;
  leads?: { name: string } | null;
  products?: { name: string; cost: number; price: number } | null;
};

export function AdminBilling() {
  const [searchTerm, setSearchTerm] = useState('');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          profiles:partner_id (full_name, email),
          leads:lead_id (name),
          products:product_id (name, cost, price)
        `)
        .eq('type', 'credit') // Apenas vendas (créditos) interessam para faturamento
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommissions(data as Commission[] || []);
    } catch (error) {
      console.error('Erro ao buscar dados de faturamento:', error);
      setMessage({ type: 'error', text: 'Não foi possível carregar os dados de faturamento.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredData = commissions.filter(c => {
    return (c.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
           (c.products?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
           (c.leads?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const stats = {
    revenue: commissions.reduce((acc, curr) => acc + Number(curr.products?.price || 0), 0),
    costs: commissions.reduce((acc, curr) => acc + Number(curr.products?.cost || 0), 0),
    commissionsPaid: commissions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0),
    get netProfit() {
      return this.revenue - this.costs - this.commissionsPaid;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Faturamento</h1>
          <p className="text-slate-500 mt-1">Visão detalhada de lucratividade, custos e comissões por venda.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchBillingData}
            className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <Download className="w-5 h-5 mr-2" />
            Exportar Relatório
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Faturamento Total</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.revenue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-lg text-red-600">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Custo de Produtos</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.costs)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Comissões Pagas</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.commissionsPaid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Lucro Líquido</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.netProfit)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por produto, parceiro ou cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Parceiro / Cliente</th>
                <th className="px-6 py-4 text-right">Preço Venda</th>
                <th className="px-6 py-4 text-right">Custo</th>
                <th className="px-6 py-4 text-right">Comissão</th>
                <th className="px-6 py-4 text-right">Lucro Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    Carregando dados de faturamento...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((comm) => {
                  const revenue = Number(comm.products?.price || 0);
                  const cost = Number(comm.products?.cost || 0);
                  const commission = Number(comm.amount || 0);
                  const profit = revenue - cost - commission;

                  return (
                    <tr key={comm.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                        {new Date(comm.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{comm.products?.name || 'Venda'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[12px]">
                        <div className="font-medium text-slate-900">{comm.profiles?.full_name}</div>
                        <div className="text-slate-400 italic">Cli: {comm.leads?.name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        {formatCurrency(revenue)}
                      </td>
                      <td className="px-6 py-4 text-right text-red-500">
                        {formatCurrency(cost)}
                      </td>
                      <td className="px-6 py-4 text-right text-amber-600">
                        {formatCurrency(commission)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-bold",
                          profit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        )}>
                          {formatCurrency(profit)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma venda encontrada para os critérios de busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
