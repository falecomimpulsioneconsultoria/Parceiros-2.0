import { useState, useEffect } from 'react';
import { Users, UserPlus, TrendingUp, Copy, X, Search, LayoutGrid, List as ListIcon, ChevronRight, ChevronDown } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface NetworkPartner {
  id: string;
  full_name: string | null;
  email: string | null;
  partner_type?: string | null;
  status: string;
  referred_by: string | null;
  created_at: string;
  children?: NetworkPartner[];
}

export function NetworkPage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [partnerType, setPartnerType] = useState<'vendedor' | 'captador'>('vendedor');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [network, setNetwork] = useState<NetworkPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  const { user } = useAuth();
  const inviteLink = `${window.location.origin}/ref/${user?.id || ''}?type=${partnerType}`;

  useEffect(() => {
    if (user) {
      fetchCurrentProfile();
      fetchNetwork();
    }
  }, [user]);

  const fetchCurrentProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setCurrentProfile(data);
    } catch (error) {
      console.error('Erro ao buscar perfil atual:', error);
    }
  };

  const fetchNetwork = async (parentId?: string) => {
    if (!user) return;
    const targetParentId = parentId || user.id;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('referred_by', targetParentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!parentId) {
        setNetwork(data as NetworkPartner[]);
        setExpandedIds({ 'root': true });
      } else {
        setNetwork(prev => updateNodeChildren(prev, parentId, data as NetworkPartner[]));
      }
    } catch (error) {
      console.error('Erro ao buscar rede:', error);
    } finally {
      if (!parentId) setLoading(false);
    }
  };

  const updateNodeChildren = (nodes: NetworkPartner[], parentId: string, children: NetworkPartner[]): NetworkPartner[] => {
    return nodes.map(node => {
      if (node.id === parentId) {
        return { ...node, children };
      }
      if (node.children) {
        return { ...node, children: updateNodeChildren(node.children, parentId, children) };
      }
      return node;
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleExpand = async (id: string, depth: number) => {
    const isExpanded = !!expandedIds[id];
    
    if (!isExpanded && depth < 3) {
      const node = findNode(network, id);
      if (id === 'root' || (node && (!node.children || node.children.length === 0))) {
        await fetchNetwork(id === 'root' ? undefined : id);
      }
    }

    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const findNode = (nodes: NetworkPartner[], id: string): NetworkPartner | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const totalLevel1 = network.length;
  const totalLevel2 = network.reduce((acc, p) => acc + (p.children?.length || 0), 0);
  const totalLevel3 = network.reduce((acc, p) => 
    acc + (p.children?.reduce((acc2, c) => acc2 + (c.children?.length || 0), 0) || 0), 0);
  const totalPartners = totalLevel1 + totalLevel2 + totalLevel3;

  const networkStats = [
    { label: 'Nível 1', value: totalLevel1.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Nível 2', value: totalLevel2.toString(), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Nível 3 (Captadores)', value: totalLevel3.toString(), icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total da Rede', value: totalPartners.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minha Rede</h1>
          <p className="text-slate-500 mt-1">Acompanhe seus indicados em até 3 níveis hierárquicos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl mr-2">
            <button 
              onClick={() => setViewMode('tree')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                viewMode === 'tree' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Árvore
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <ListIcon className="w-4 h-4" />
              Lista
            </button>
          </div>
          
          {/* Somente Vendedores podem indicar (Administrador é verificado pelo meta ou tipo) */}
          {currentProfile?.partner_type !== 'captador' && (
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Indicar Parceiro
            </button>
          )}
        </div>
      </div>
      
      {/* Aviso para Captadores se não puderem indicar */}
      {currentProfile?.partner_type === 'captador' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-full">
            <X className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">Perfil Captador Limitado</p>
            <p className="text-xs text-amber-700 mt-0.5">Como captador, você pode visualizar sua rede, mas o link de indicação está desabilitado. Solicite a alteração para Vendedor com seu administrador para liberar indicações.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
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

      {/* Network View Mode Switcher */}
      {viewMode === 'tree' ? (
        /* Árvore Visual (As already implemented) */
        <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-x-auto min-h-[500px] relative p-12 scrollbar-none shadow-inner">
          <div className="min-w-max mx-auto flex flex-col items-center">
            {/* Root node */}
            <div className="relative flex flex-col items-center mb-16">
              <div 
                className={cn(
                  "relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-xl border-4 border-white ring-4 ring-indigo-100 transition-all duration-300 cursor-pointer hover:scale-105",
                  "bg-gradient-to-br from-indigo-500 to-indigo-700"
                )}
                onClick={() => toggleExpand('root', 0)}
              >
                {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'V'}
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white text-[10px] shadow-sm">
                  ✓
                </div>
              </div>
              <div className="absolute -bottom-12 flex flex-col items-center w-48">
                <span className="text-sm font-bold text-slate-800 text-center leading-tight">{currentProfile?.full_name || user?.user_metadata?.full_name || 'Sponsor Master'}</span>
                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Sponsor Master</span>
              </div>
              
              {/* Vertical Line to Children */}
              {expandedIds['root'] && network.length > 0 && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-px h-16 bg-slate-300"></div>
              )}
            </div>

            {/* First Level Children */}
            {expandedIds['root'] && (
              <div className="flex justify-center gap-6 relative pt-4">
                {network.map((p, index) => (
                  <NetworkTreeNode 
                    key={p.id} 
                    partner={p} 
                    depth={1} 
                    toggleExpand={toggleExpand} 
                    expandedIds={expandedIds}
                    isFirst={index === 0}
                    isLast={index === network.length - 1}
                  />
                ))}
              </div>
            )}
            
            {!loading && network.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">Nenhum parceiro direto ainda.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Visualização em Lista */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-500">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar parceiro..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium italic">
              * Lista hierárquica com carregamento inteligente
            </div>
          </div>
          
          <div className="p-6">
            {!loading && network.length > 0 ? (
              <div className="space-y-4">
                {network.filter(p => p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.email?.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
                  <NetworkListRow 
                    key={p.id} 
                    partner={p} 
                    depth={1} 
                    toggleExpand={toggleExpand} 
                    expandedIds={expandedIds}
                  />
                ))}
              </div>
            ) : !loading && (
              <div className="py-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Use o convite para expandir sua rede.</p>
              </div>
            )}
          </div>
        </div>
      )}

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
                Escolha o tipo de parceiro que deseja indicar e compartilhe o link exclusivo ou o QR Code.
              </p>

              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button 
                  onClick={() => setPartnerType('vendedor')}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                    partnerType === 'vendedor' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Indicar Vendedor
                </button>
                <button 
                  onClick={() => setPartnerType('captador')}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                    partnerType === 'captador' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Indicar Captador
                </button>
              </div>

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

function NetworkTreeNode({ 
  partner, 
  depth, 
  toggleExpand, 
  expandedIds,
  isFirst,
  isLast 
}: { 
  partner: any, 
  depth: number, 
  toggleExpand: (id: string, depth: number) => void,
  expandedIds: Record<string, boolean>,
  isFirst?: boolean,
  isLast?: boolean
}) {
  const isExpanded = !!expandedIds[partner.id];
  
  // Regra Nível 3: Apenas captadores
  const visibleChildren = depth === 2 
    ? (partner.children?.filter((c: any) => c.partner_type === 'captador') || [])
    : (partner.children || []);

  const hasVisibleChildren = visibleChildren.length > 0;

  return (
    <div className="flex flex-col items-center relative min-w-[120px] px-2 animate-in zoom-in-95 duration-300">
      {/* Connector line up to parent */}
      {depth > 0 && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <div className={cn("flex-1 h-0.5 mt-[15px] bg-slate-300", isFirst && "bg-transparent")} />
          <div className="w-0.5 h-4 bg-slate-400" />
          <div className={cn("flex-1 h-0.5 mt-[15px] bg-slate-300", isLast && "bg-transparent")} />
        </div>
      )}
      
      {/* Node */}
      <div 
        className={cn(
          "relative z-10 w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg shadow-md border-4 border-white transition-all duration-300 cursor-pointer hover:scale-110",
          partner.partner_type === 'captador' 
            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white" 
            : "bg-gradient-to-br from-blue-400 to-blue-600 text-white",
          partner.status === 'Ativo' ? "ring-4 ring-emerald-50" : "grayscale ring-4 ring-slate-100 shadow-inner"
        )}
        onClick={() => toggleExpand(partner.id, depth)}
      >
        {partner.full_name?.charAt(0).toUpperCase() || 'P'}
        
        {/* Expand/Collapse Indicator */}
        {(depth < 3) && (
          <div className={cn(
            "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[12px] shadow-sm border-2 border-white font-black",
            isExpanded ? "bg-slate-800 text-white" : "bg-white text-slate-800"
          )}>
            {isExpanded ? '-' : '+'}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="mt-4 flex flex-col items-center max-w-[120px]">
        <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">{partner.full_name}</span>
        <span className={cn(
          "text-[8px] font-extrabold uppercase tracking-tighter px-2 py-0.5 rounded-full mt-1 border shadow-sm",
          partner.partner_type === 'captador' ? "text-amber-700 bg-amber-50 border-amber-100" : "text-blue-700 bg-blue-50 border-blue-100"
        )}>
          {partner.partner_type === 'captador' ? 'Captador' : 'Vendedor'}
        </span>
      </div>

      {/* Vertical Line down to children */}
      {isExpanded && hasVisibleChildren && (
        <div className="w-0.5 h-6 bg-slate-400"></div>
      )}

      {/* Children Container */}
      {isExpanded && hasVisibleChildren && (
        <div className="flex justify-center gap-4 relative pt-4">
          {visibleChildren.map((child: any, index: number) => (
            <NetworkTreeNode 
              key={child.id} 
              partner={child} 
              depth={depth + 1} 
              toggleExpand={toggleExpand} 
              expandedIds={expandedIds}
              isFirst={index === 0}
              isLast={index === visibleChildren.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NetworkListRow({ 
  partner, 
  depth, 
  toggleExpand, 
  expandedIds 
}: { 
  partner: any, 
  depth: number, 
  toggleExpand: (id: string, depth: number) => void,
  expandedIds: Record<string, boolean>
}) {
  const isExpanded = !!expandedIds[partner.id];
  const visibleChildren = depth === 2 
    ? (partner.children?.filter((c: any) => c.partner_type === 'captador') || [])
    : (partner.children || []);

  const hasVisibleChildren = visibleChildren.length > 0;

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
      <div 
        className={cn(
          "group flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer mb-2",
          isExpanded ? "bg-slate-50 border-indigo-200 shadow-sm" : "bg-white border-slate-100 hover:border-indigo-100 hover:shadow-sm"
        )}
        onClick={() => toggleExpand(partner.id, depth)}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm",
          partner.partner_type === 'captador' ? "bg-amber-500" : "bg-indigo-500"
        )}>
          {partner.full_name?.charAt(0).toUpperCase()}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{partner.full_name}</span>
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border",
              partner.partner_type === 'captador' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-blue-50 text-blue-700 border-blue-200"
            )}>
              {partner.partner_type === 'captador' ? 'Captador' : 'Vendedor'}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
              Nível {depth}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">{partner.email}</div>
        </div>

        <div className="flex items-center gap-4">
          <div className={cn(
            "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
            partner.status === 'Ativo' ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-50"
          )}>
            {partner.status}
          </div>
          {(depth < 3) && (
            <div className="text-slate-300 group-hover:text-indigo-400 transition-colors">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          )}
        </div>
      </div>

      {isExpanded && visibleChildren.length > 0 && (
        <div className="ml-8 space-y-1 border-l-2 border-slate-100 pl-4 animate-in slide-in-from-top-2 duration-300">
          {visibleChildren.map((child: any) => (
            <NetworkListRow 
              key={child.id} 
              partner={child} 
              depth={depth + 1} 
              toggleExpand={toggleExpand} 
              expandedIds={expandedIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}
