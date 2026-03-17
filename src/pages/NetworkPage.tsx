import { useState, useEffect } from 'react';
import { Users, UserPlus, TrendingUp, Copy, CheckCircle2, X, QrCode, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function NetworkPage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [partners, setPartners] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const inviteLink = `${window.location.origin}/ref/${user?.id || ''}`;

  useEffect(() => {
    if (user) {
      fetchNetwork();
    }
  }, [user]);

  const fetchNetwork = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('referred_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Erro ao buscar rede:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredPartners = partners.filter(p => 
    (p.full_name && p.full_name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPartners = partners.length;
  const activePartners = partners.filter(p => p.status === 'Ativo').length;

  const networkStats = [
    { label: 'Total de Parceiros', value: totalPartners.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Parceiros Ativos', value: activePartners.toString(), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Vendas da Rede', value: '-', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minha Rede</h1>
          <p className="text-slate-500 mt-1">Gerencie seus parceiros indicados e acompanhe os resultados.</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Indicar Parceiro
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {networkStats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
            <div className={cn("p-4 rounded-full mr-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Partners List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Parceiros Indicados</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar parceiro..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Parceiro</th>
                <th className="px-6 py-4">Data de Entrada</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Carregando parceiros...
                  </td>
                </tr>
              ) : filteredPartners.length > 0 ? (
                filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{partner.full_name || 'Usuário'}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{partner.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(partner.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                        partner.status === 'Ativo' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {partner.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    Nenhum parceiro encontrado na sua rede.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Indicar Novo Parceiro</h3>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-sm text-slate-600">
                Compartilhe seu link exclusivo ou mostre o QR Code para que novos parceiros se cadastrem na sua rede.
              </p>

              <div className="flex justify-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <QRCodeSVG value={inviteLink} size={180} level="H" includeMargin />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Seu Link de Indicação</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={inviteLink}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-600 focus:outline-none"
                  />
                  <button 
                    onClick={handleCopy}
                    className="flex items-center justify-center px-4 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm"
                  >
                    {copied ? 'Copiado!' : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
