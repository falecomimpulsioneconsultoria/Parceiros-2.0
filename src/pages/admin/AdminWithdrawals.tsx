import { useState } from 'react';
import { Search, Filter, CheckCircle2, XCircle, Clock, Wallet, X, AlertCircle, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';

const mockWithdrawals = [
  { id: 'W1', partner: 'João Silva', email: 'joao@email.com', amount: 'R$ 4.500,00', pixKey: 'joao@email.com (E-mail)', date: '15/03/2026', status: 'Pendente' },
  { id: 'W2', partner: 'Maria Santos', email: 'maria@email.com', amount: 'R$ 850,00', pixKey: '11987654321 (Celular)', date: '14/03/2026', status: 'Pendente' },
  { id: 'W3', partner: 'Ana Oliveira', email: 'ana@email.com', amount: 'R$ 1.200,00', pixKey: '123.456.789-00 (CPF)', date: '12/03/2026', status: 'Aprovado' },
  { id: 'W4', partner: 'Pedro Costa', email: 'pedro@email.com', amount: 'R$ 300,00', pixKey: 'pedro@email.com (E-mail)', date: '10/03/2026', status: 'Rejeitado' },
  { id: 'W5', partner: 'Carlos Ferreira', email: 'carlos@email.com', amount: 'R$ 2.100,00', pixKey: 'carlos.f@email.com (E-mail)', date: '09/03/2026', status: 'Aprovado' },
];

const stats = [
  { label: 'Aguardando Pagamento', value: '12 solicitações', amount: 'R$ 15.350,00', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Pagos Hoje', value: '5 solicitações', amount: 'R$ 3.200,00', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Total Pago no Mês', value: '48 solicitações', amount: 'R$ 42.500,00', icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

export function AdminWithdrawals() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [selectedRequest, setSelectedRequest] = useState<typeof mockWithdrawals[0] | null>(null);
  const [modalType, setModalType] = useState<'approve' | 'reject' | null>(null);

  const filteredWithdrawals = mockWithdrawals.filter(w => {
    const matchesSearch = w.partner.toLowerCase().includes(searchTerm.toLowerCase()) || w.email.toLowerCase().includes(searchTerm.toLowerCase());
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

  const openModal = (request: typeof mockWithdrawals[0], type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setModalType(type);
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setModalType(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Saques</h1>
          <p className="text-slate-500 mt-1">Aprove ou rejeite as solicitações de saque dos parceiros.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
            <div className={cn("p-4 rounded-full mr-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.amount}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
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
              {filteredWithdrawals.length > 0 ? (
                filteredWithdrawals.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{request.date}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{request.partner}</div>
                      <div className="text-xs text-slate-500">{request.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 font-medium">{request.pixKey}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {request.amount}
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
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => openModal(request, 'reject')}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Rejeitar Pagamento"
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
                  <span className="font-medium text-slate-900">{selectedRequest.partner}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Valor:</span>
                  <span className="font-bold text-emerald-600">{selectedRequest.amount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Chave PIX:</span>
                  <span className="font-medium text-slate-900">{selectedRequest.pixKey}</span>
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
              >
                Cancelar
              </button>
              <button 
                onClick={closeModal}
                className={cn(
                  "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm",
                  modalType === 'approve' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                )}
              >
                {modalType === 'approve' ? 'Confirmar Pagamento' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
