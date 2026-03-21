import React, { useState, useEffect } from 'react';
import { DollarSign, Search, Filter, Download, ArrowUpRight, Clock, CheckCircle2, AlertCircle, User, Package, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Commission = Database['public']['Tables']['commissions']['Row'] & {
  profiles?: { full_name: string; email: string } | null;
  leads?: { name: string } | null;
  products?: { name: string; price?: number; cost?: number } | null;
  type: 'credit' | 'debit';
  notes?: string;
};

export function AdminCommissions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          profiles:partner_id (full_name, email),
          leads:lead_id (name),
          products:product_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommissions(data as Commission[] || []);
    } catch (error) {
      console.error('Erro ao buscar comissões:', error);
      setMessage({ type: 'error', text: 'Não foi possível carregar o extrato de comissões.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredCommissions = commissions.filter(c => {
    const searchMatch = 
      (c.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.products?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.leads?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.notes?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const typeMatch = filterType === 'all' || c.type === filterType;
    
    return searchMatch && typeMatch;
  });

  const stats = {
    total: commissions.filter(c => c.type === 'credit').reduce((acc, curr) => acc + Number(curr.amount), 0),
    pending: commissions.filter(c => c.status === 'Pendente' && c.type === 'credit').reduce((acc, curr) => acc + Number(curr.amount), 0),
    released: commissions.filter(c => c.status === 'Disponível' && c.type === 'credit').reduce((acc, curr) => acc + Number(curr.amount), 0),
    totalProfit: commissions.filter(c => c.type === 'credit' && c.products).reduce((acc, curr) => {
      const price = Number(curr.products?.price || 0);
      const cost = Number(curr.products?.cost || 0);
      const commission = Number(curr.amount || 0);
      return acc + (price - cost - commission);
    }, 0),
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Extrato de Comissões (Geral)</h1>
          <p className="text-slate-500 mt-1">Gerenciamento e conferência de todas as comissões do sistema.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchCommissions}
            className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Atualizar"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <Download className="w-5 h-5 mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Produzido</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.total)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Aguardando Liberação</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.pending)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Saldo Já Disponível</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.released)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl text-white md:col-span-3 lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-lg text-indigo-400">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Lucro Bruto Total</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalProfit)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por parceiro, produto ou cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full"
              />
            </div>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
            >
              <option value="all">Todas</option>
              <option value="credit">Apenas Créditos</option>
              <option value="debit">Apenas Débitos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Parceiro</th>
                <th className="px-6 py-4">Detalhes</th>
                <th className="px-6 py-4">Tipo/Nível</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    Carregando movimentações...
                  </td>
                </tr>
              ) : filteredCommissions.length > 0 ? (
                filteredCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {new Date(comm.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{comm.profiles?.full_name || 'Desconhecido'}</p>
                          <p className="text-[10px] text-slate-500">{comm.profiles?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-medium text-slate-900 line-clamp-1">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          {comm.products?.name || 'Venda'}
                        </div>
                        <div className="text-[10px] text-slate-500 italic">{comm.notes}</div>
                        <div className="text-[10px] text-slate-500">Cliente: {comm.leads?.name || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          comm.type === 'credit' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        )}>
                          {comm.type === 'credit' ? 'Crédito' : 'Débito'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium italic">{comm.notes}</span>
                      </div>
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-right font-bold text-sm whitespace-nowrap",
                      comm.type === 'credit' ? "text-slate-900" : "text-red-600"
                    )}>
                      {comm.type === 'debit' ? '-' : '+'}{formatCurrency(comm.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                        comm.status === 'Disponível' ? "bg-emerald-100 text-emerald-700" :
                        comm.status === 'Pendente' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {comm.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma comissão encontrada.
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
