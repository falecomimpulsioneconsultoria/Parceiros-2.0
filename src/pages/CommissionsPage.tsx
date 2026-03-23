import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowUpRight, Clock, CheckCircle2, Search, Filter, Download, Wallet, X, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Commission = Database['public']['Tables']['commissions']['Row'] & {
  leads?: { name: string } | null;
  products?: { name: string } | null;
  type?: 'credit' | 'debit';
  notes?: string;
  lead_deals?: { deal_number: number | null } | null;
};

type Withdrawal = Database['public']['Tables']['withdrawals']['Row'];

const getParsedNotes = (notes: string) => {
  if (!notes) return { level: '', installment: '' };
  
  if (notes.startsWith('Nível 1')) {
    const parts = notes.split(' - ');
    if (parts.length > 1) {
      return { level: parts[0], installment: parts[1] };
    }
  }
  
  const match = notes.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    let level = match[1].trim();
    if (level === 'Comissão Captador') level = 'Captador';
    if (level === 'Comissão Vendedor') level = 'Vendedor';
    return { level: level, installment: match[2].trim() };
  }
  
  return { level: notes, installment: '' };
};

export function CommissionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const { user, role, partnerType: authPartnerType } = useAuth();
  const isAdmin = role === 'admin';
  const isVendedor = role === 'partner' && authPartnerType?.toLowerCase() === 'vendedor';
  const isCaptador = role === 'partner' && authPartnerType?.toLowerCase() === 'captador';

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, role, authPartnerType]);


  const fetchData = async () => {
    setLoading(true);
    try {
      let commQuery = supabase
        .from('commissions')
        .select(`
          *,
          leads (name),
          products (name),
          lead_deals:deal_id (deal_number)
        `)
        .order('created_at', { ascending: false });

      let withQuery = supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin && !isVendedor) {
        commQuery = commQuery.eq('partner_id', user?.id);
        withQuery = withQuery.eq('partner_id', user?.id);
      }

      const settingsQuery = supabase
        .from('system_settings')
        .select('min_withdrawal')
        .limit(1)
        .maybeSingle();

      const [commRes, withRes, settingsRes] = await Promise.all([commQuery, withQuery, settingsQuery]);

      if (commRes.error) throw commRes.error;
      if (withRes.error) throw withRes.error;

      setCommissions(((commRes.data as unknown) as Commission[]) || []);
      setWithdrawals(withRes.data as Withdrawal[] || []);
      
      if (settingsRes.data && settingsRes.data.min_withdrawal) {
        setMinWithdrawal(settingsRes.data.min_withdrawal);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setMessage({ type: 'error', text: 'Não foi possível carregar as comissões.' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const amount = parseFloat(withdrawAmount.replace(',', '.'));
      
      if (isNaN(amount) || amount < minWithdrawal) {
        throw new Error(`Valor mínimo para saque é R$ ${minWithdrawal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }

      if (amount > availableBalance) {
        throw new Error('Saldo insuficiente');
      }

      if (!pixKey.trim()) {
        throw new Error('Chave PIX é obrigatória');
      }

      const withdrawalData: Database['public']['Tables']['withdrawals']['Insert'] = {
        partner_id: user?.id as string,
        amount,
        pix_key: pixKey,
        status: 'Pendente'
      };

      const { error } = await supabase
        .from('withdrawals')
        .insert([withdrawalData]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Saque solicitado com sucesso!' });
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      setPixKey('');
      fetchData();
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Erro ao solicitar saque:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao solicitar saque.' });
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalDisponivel = commissions
    .filter(c => c.status === 'Disponível')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
    
  const totalSaquesPendentesAprovados = withdrawals
    .filter(w => w.status !== 'Rejeitado')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const availableBalance = totalDisponivel - totalSaquesPendentesAprovados;

  const futureReleases = commissions
    .filter(c => c.status === 'Pendente')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalReceived = withdrawals
    .filter(w => w.status === 'Aprovado')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const commissionStats = [
    { label: 'Saldo Disponível', value: availableBalance, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Lançamentos Futuros', value: futureReleases, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Sacado', value: totalReceived, icon: ArrowUpRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const sortedStatement = [
    ...commissions.map(c => ({
      id: c.id,
      date: c.created_at,
      description: c.type === 'debit' ? 'Saque realizado' : (c.products?.name || 'Comissão de venda'),
      customer: c.leads?.name || '-',
      amount: c.amount,
      type: c.type || 'credit',
      status: c.status,
      notes: c.notes,
      dealNumber: c.lead_deals?.deal_number
    })),
    ...withdrawals.filter(w => w.status === 'Pendente').map(w => ({
      id: w.id,
      date: w.created_at,
      description: 'Saque solicitado (Pendente)',
      customer: '-',
      amount: w.amount,
      type: 'debit',
      status: w.status,
      dealNumber: undefined
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const groupedStatement = React.useMemo(() => {
    const groups = sortedStatement.reduce((acc, curr) => {
      const customer = curr.customer !== '-' ? curr.customer : 'Solicitações de Saque';
      if (!acc[customer]) {
        acc[customer] = {
          items: [],
          total: 0,
          latestDate: new Date(0).getTime(),
          deals: {}
        };
      }
      
      const val = curr.type === 'credit' ? Number(curr.amount) : -Number(curr.amount);
      acc[customer].items.push(curr);
      acc[customer].total += val;
      
      const dTime = new Date(curr.date).getTime();
      if (dTime > acc[customer].latestDate) {
        acc[customer].latestDate = dTime;
      }
      
      const dealNumberStr = curr.dealNumber ? `Negócio #${curr.dealNumber.toString().padStart(4, '0')}` : 'Outras Comissões';
      const dealName = curr.description && curr.description !== 'Saque solicitado (Pendente)' && curr.description !== 'Saque realizado' && curr.dealNumber 
        ? `${dealNumberStr} - ${curr.description}` 
        : (curr.type === 'debit' ? 'Saques' : dealNumberStr);
      
      if (!acc[customer].deals[dealName]) {
        acc[customer].deals[dealName] = { items: [], total: 0 };
      }
      acc[customer].deals[dealName].items.push(curr);
      acc[customer].deals[dealName].total += val;
      
      return acc;
    }, {} as Record<string, { items: typeof sortedStatement, total: number, latestDate: number, deals: Record<string, { items: typeof sortedStatement, total: number }> }>);

    return Object.entries(groups).sort((a, b) => b[1].latestDate - a[1].latestDate);
  }, [sortedStatement]);

  const [minWithdrawal, setMinWithdrawal] = useState(100);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (customer: string) => {
    setExpandedGroups(prev => ({ ...prev, [customer]: !prev[customer] }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Pago': return 'bg-emerald-100 text-emerald-700';
      case 'Disponível': return 'bg-blue-100 text-blue-700';
      case 'Pendente': return 'bg-yellow-100 text-yellow-800';
      case 'Rejeitado': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Extrato Financeiro</h1>
          <p className="text-slate-500 mt-1">Acompanhe seus ganhos e movimentações.</p>
        </div>
        {role === 'partner' && (
          <button 
            onClick={() => setIsWithdrawModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <DollarSign className="w-5 h-5 mr-2" />
            Solicitar Saque
          </button>
        )}
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {commissionStats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
            <div className={cn("p-4 rounded-full mr-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stat.value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Unified Financial Statement */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Histórico de Movimentações</h2>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar movimentação..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Detalhes</th>
                <th className="px-6 py-4">Tipo/Nível</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Carregando extrato...
                  </td>
                </tr>
              ) : groupedStatement.length > 0 ? (
                groupedStatement.map(([customer, group]) => (
                  <React.Fragment key={customer}>
                    <tr 
                      onClick={() => toggleGroup(customer)}
                      className="bg-slate-50 border-b border-emerald-100/50 hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      <td colSpan={5} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-1 rounded bg-slate-200 text-slate-500">
                              {expandedGroups[customer] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                            <span className="font-semibold text-slate-800">{customer}</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                              {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-500">Saldo Oportunidade:</span>
                            <span className={cn(
                              "font-bold text-sm",
                              group.total >= 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                              {group.total >= 0 ? '+' : ''}{formatCurrency(group.total)}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedGroups[customer] && Object.entries(group.deals).map(([dealName, dealGroup]) => (
                      <React.Fragment key={dealName}>
                        <tr className="bg-slate-50/50 border-b border-emerald-100/50">
                          <td colSpan={5} className="px-6 py-2">
                            <div className="flex items-center justify-between pl-8">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                <span className="text-sm font-semibold text-slate-700">{dealName}</span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-medium">
                                  {dealGroup.items.length} {dealGroup.items.length === 1 ? 'item' : 'itens'}
                                </span>
                              </div>
                              <div className={cn("text-xs font-bold", dealGroup.total >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {dealGroup.total >= 0 ? '+' : ''}{formatCurrency(dealGroup.total)}
                              </div>
                            </div>
                          </td>
                        </tr>
                        {dealGroup.items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 pl-16">
                              <div className="font-medium text-slate-700">{new Date(item.date).toLocaleDateString('pt-BR')}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900 line-clamp-1">{item.description}</div>
                              {getParsedNotes((item as any).notes || '').installment && (
                                <div className="text-[10px] text-slate-500 italic">{getParsedNotes((item as any).notes || '').installment}</div>
                              )}
                              {item.customer !== '-' && (
                                <div className="text-[10px] text-slate-500 mt-0.5">Cliente: {item.customer}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col items-start gap-1">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                  item.type === 'credit' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                )}>
                                  {item.type === 'credit' ? 'Crédito' : 'Débito'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium italic">
                                  {getParsedNotes((item as any).notes || '').level || 'Transação interna'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                              {item.type === 'debit' ? '-' : '+'}{formatCurrency(item.amount)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                                getStatusStyle(item.status)
                              )}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Solicitar Saque</h3>
              <button 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleWithdraw}>
              <div className="p-6 space-y-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-900">Saldo Disponível para Saque</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(availableBalance)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Valor do Saque</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                      placeholder="0,00" 
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-slate-500 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Valor mínimo: R$ {minWithdrawal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <button 
                      type="button"
                      onClick={() => setWithdrawAmount(availableBalance.toString())}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      Sacar valor total
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <label className="text-sm font-medium text-slate-700">Chave PIX de Destino</label>
                  <input 
                    type="text" 
                    required
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                    placeholder="E-mail, CPF, CNPJ ou Telefone" 
                  />
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading || availableBalance < minWithdrawal}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Confirmar Saque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
