import { useState } from 'react';
import { Search, Filter, MoreHorizontal, CheckCircle2, XCircle, Shield, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';

const mockPartners = [
  { id: '1', name: 'João Silva', email: 'joao@email.com', level: 'Master', networkSize: 45, totalSales: 'R$ 45.000', status: 'Ativo', joinedAt: '10/01/2026', referredBy: '-' },
  { id: '2', name: 'Maria Santos', email: 'maria@email.com', level: 'Afiliado', networkSize: 12, totalSales: 'R$ 12.500', status: 'Ativo', joinedAt: '15/02/2026', referredBy: 'João Silva' },
  { id: '3', name: 'Pedro Costa', email: 'pedro@email.com', level: 'Afiliado', networkSize: 0, totalSales: 'R$ 0', status: 'Bloqueado', joinedAt: '01/03/2026', referredBy: 'Maria Santos' },
  { id: '4', name: 'Ana Oliveira', email: 'ana@email.com', level: 'Premium', networkSize: 128, totalSales: 'R$ 156.000', status: 'Ativo', joinedAt: '05/11/2025', referredBy: '-' },
  { id: '5', name: 'Carlos Ferreira', email: 'carlos@email.com', level: 'Afiliado', networkSize: 3, totalSales: 'R$ 1.200', status: 'Pendente', joinedAt: '14/03/2026', referredBy: 'Ana Oliveira' },
];

export function AdminPartners() {
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-emerald-100 text-emerald-700';
      case 'Bloqueado': return 'bg-red-100 text-red-700';
      case 'Pendente': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredPartners = mockPartners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Parceiros</h1>
          <p className="text-slate-500 mt-1">Gerencie todos os afiliados e parceiros da plataforma.</p>
        </div>
        <button className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
          <UserPlus className="w-5 h-5 mr-2" />
          Adicionar Parceiro
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full"
            />
          </div>
          <button className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Parceiro</th>
                <th className="px-6 py-4">Indicado por</th>
                <th className="px-6 py-4">Nível</th>
                <th className="px-6 py-4">Tamanho da Rede</th>
                <th className="px-6 py-4">Vendas Totais</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Cadastro</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPartners.map((partner) => (
                <tr key={partner.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{partner.name}</div>
                    <div className="text-xs text-slate-500">{partner.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    {partner.referredBy !== '-' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                        <UserPlus className="w-3 h-3" />
                        {partner.referredBy}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">{partner.level}</td>
                  <td className="px-6 py-4">{partner.networkSize} indicados</td>
                  <td className="px-6 py-4 font-medium text-emerald-600">{partner.totalSales}</td>
                  <td className="px-6 py-4">
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", getStatusStyle(partner.status))}>
                      {partner.status === 'Ativo' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {partner.status === 'Bloqueado' && <XCircle className="w-3 h-3 mr-1" />}
                      {partner.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{partner.joinedAt}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
