import { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle2, XCircle, Clock, Wallet, X, AlertCircle, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

// Removi o objeto estático e gerarei no componente

export function AdminWithdrawals() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [modalType, setModalType] = useState<'approve' | 'reject' | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles:partner_id (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Erro ao buscar saques:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setLoading(true);
    try {
      // 1. Atualizar status do saque
      const { error: withError } = await supabase
        .from('withdrawals')
        .update({ status: 'Aprovado' })
        .eq('id', selectedRequest.id);

      if (withError) throw withError;

      // 2. Lançar débito no extrato (commissions)
      const { error: commError } = await supabase
        .from('commissions')
        .insert([{
          partner_id: selectedRequest.partner_id,
          amount: selectedRequest.amount,
          status: 'Pago',
          type: 'debit',
          notes: `Resgate de Saldo (Solicitação #${selectedRequest.id.slice(0, 8)})`
        }]);

      if (commError) throw commError;

      alert('Saque aprovado e débito lançado no extrato!');
      fetchWithdrawals();
      closeModal();
    } catch (error) {
      console.error('Erro ao aprovar saque:', error);
      alert('Falha ao aprovar saque.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!selectedRequest) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'Rejeitado',
          notes: reason 
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      alert('Solicitação de saque rejeitada.');
      fetchWithdrawals();
      closeModal();
    } catch (error) {
      console.error('Erro ao rejeitar saque:', error);
      alert('Falha ao rejeitar saque.');
    } finally {
      setLoading(false);
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    const partnerName = w.profiles?.full_name || '';
    const partnerEmail = w.profiles?.email || '';
    const matchesSearch = partnerName.toLowerCase().includes(searchTerm.toLowerCase()) || partnerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Aprovado': return 'bg-emerald-100 text-emerald-700';
      case 'Rejeitado': return 'bg-red-100 text-red-700';
      case 'Pendente': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const openModal = (request: any, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setModalType(type);
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setModalType(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Saques</h1>
          <p className="text-slate-500 mt-1">Aprove ou rejeite as solicitações de saque dos parceiros.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
          <div className="p-4 rounded-full bg-amber-50 mr-4">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Aguardando Pagamento</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(withdrawals.filter(w => w.status === 'Pendente').reduce((acc, curr) => acc + Number(curr.amount), 0))}
            </p>
            <p className="text-xs text-slate-400 mt-1">{withdrawals.filter(w => w.status === 'Pendente').length} solicitações</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
          <div className="p-4 rounded-full bg-emerald-50 mr-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pagos (Aprovados)</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(withdrawals.filter(w => w.status === 'Aprovado').reduce((acc, curr) => acc + Number(curr.amount), 0))}
            </p>
            <p className="text-xs text-slate-400 mt-1">{withdrawals.filter(w => w.status === 'Aprovado').length} finalizados</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
          <div className="p-4 rounded-full bg-indigo-50 mr-4">
            <Wallet className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Solicitado</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(withdrawals.reduce((acc, curr) => acc + Number(curr.amount), 0))}
            </p>
            <p className="text-xs text-slate-400 mt-1">Volume global de saques</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por parceiro ou e-mail..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 pl-3 pr-8 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="Todos">Todos os Status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Aprovado">Aprovados</option>
              <option value="Rejeitado">Rejeitados</option>
            </select>
          </div>
          <button className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Parceiro</th>
                <th className="px-6 py-4">Chave PIX</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 animate-pulse">
                    Carregando solicitações...
                  </td>
                </tr>
              ) : filteredWithdrawals.length > 0 ? (
                filteredWithdrawals.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {new Date(request.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{request.profiles?.full_name || '—'}</div>
                      <div className="text-xs text-slate-500">{request.profiles?.email || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 font-medium">{request.pix_key}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(request.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", getStatusStyle(request.status))}>
                        {request.status === 'Aprovado' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {request.status === 'Rejeitado' && <XCircle className="w-3 h-3 mr-1" />}
                        {request.status === 'Pendente' && <Clock className="w-3 h-3 mr-1" />}
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {request.status === 'Pendente' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openModal(request, 'approve')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            title="Aprovar Pagamento"
                            disabled={loading}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => openModal(request, 'reject')}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Rejeitar Pagamento"
                            disabled={loading}
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button className="text-slate-400 hover:text-indigo-600 text-xs font-medium transition-colors">
                          Ver Detalhes
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {selectedRequest && modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {modalType === 'approve' ? 'Aprovar Pagamento' : 'Rejeitar Solicitação'}
              </h3>
              <button 
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Parceiro:</span>
                  <span className="font-medium text-slate-900">{selectedRequest.profiles?.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Valor:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(selectedRequest.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Chave PIX:</span>
                  <span className="font-medium text-slate-900">{selectedRequest.pix_key}</span>
                </div>
              </div>

              {modalType === 'approve' ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>Confirme que você já realizou a transferência PIX para a chave informada acima antes de aprovar.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Comprovante (Opcional)</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                      <FileText className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Clique para anexar o comprovante</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Motivo da Rejeição</label>
                  <textarea 
                    id="rejectReason"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 min-h-[100px]" 
                    placeholder="Informe ao parceiro o motivo da rejeição (ex: Chave PIX inválida, suspeita de fraude...)"
                  ></textarea>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (modalType === 'approve') {
                    handleApprove();
                  } else {
                    const reason = (document.getElementById('rejectReason') as HTMLTextAreaElement)?.value || '';
                    handleReject(reason);
                  }
                }}
                disabled={loading}
                className={cn(
                  "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm",
                  modalType === 'approve' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? 'Processando...' : modalType === 'approve' ? 'Confirmar Pagamento' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
