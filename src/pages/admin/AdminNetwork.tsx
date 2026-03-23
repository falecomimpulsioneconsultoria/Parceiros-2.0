import { useState, useEffect } from 'react';
import { Users, UserPlus, TrendingUp, Search, LayoutGrid, List as ListIcon, ChevronRight, ChevronDown, Shield, Mail, Phone, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface NetworkPartner extends Profile {
  children?: NetworkPartner[];
}

export function AdminNetwork() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [network, setNetwork] = useState<NetworkPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [stats, setStats] = useState({
    total: 0,
    vendedores: 0,
    captadores: 0,
    ativos: 0
  });

  useEffect(() => {
    fetchAllPartners();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('partner_type, status')
        .in('role', ['partner', 'admin']);

      if (error) throw error;

      if (data) {
        setStats({
          total: data.length,
          vendedores: data.filter(p => p.partner_type === 'vendedor').length,
          captadores: data.filter(p => p.partner_type === 'captador').length,
          ativos: data.filter(p => p.status === 'Ativo').length
        });
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const fetchAllPartners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['partner', 'admin'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      
      if (data) {
        const buildTree = (partners: Profile[]) => {
          const map: Record<string, NetworkPartner> = {};
          const roots: NetworkPartner[] = [];

          // Primeiro, criar o mapa
          partners.forEach(p => {
            map[p.id] = { ...p, children: [] };
          });

          // Segundo, ligar os nós
          partners.forEach(p => {
            const node = map[p.id];
            const parentId = p.referred_by;

            if (parentId && map[parentId]) {
              map[parentId].children?.push(node);
            } else {
              roots.push(node);
            }
          });

          return roots;
        };

        setNetwork(buildTree(data as Profile[]));
        
        // Auto-expandir raízes
        const rootIds: Record<string, boolean> = {};
        data.forEach(p => {
          if (!p.referred_by || p.referred_by === 'admin-root') {
            rootIds[p.id] = true;
          }
        });
        setExpandedIds(rootIds);
      }
    } catch (error) {
      console.error('Erro ao buscar rede:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
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

  const networkStats = [
    { label: 'Total Geral', value: stats.total.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Vendedores', value: stats.vendedores.toString(), icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Captadores', value: stats.captadores.toString(), icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Parceiros Ativos', value: stats.ativos.toString(), icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Árvore de Rede Master</h1>
          <p className="text-slate-500 mt-1">Visualize toda a estrutura hierárquica do sistema sem limites.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex p-1 bg-slate-100 rounded-xl">
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
        </div>
      </div>

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

      {/* Network View */}
      {viewMode === 'tree' ? (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-x-auto min-h-[600px] relative scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent shadow-inner">
          <div className="inline-flex flex-col items-center min-w-full py-12 lg:py-24">
            <div className="flex justify-center gap-6 relative px-12">
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
            
            {!loading && network.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">Nenhum parceiro encontrado na raiz.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-500">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar em toda a rede..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium italic">
              * Explorando estrutura ilimitada
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
                <p>Nenhum parceiro para exibir.</p>
              </div>
            )}
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
  toggleExpand: (id: string) => void,
  expandedIds: Record<string, boolean>,
  isFirst?: boolean,
  isLast?: boolean
}) {
  const isExpanded = !!expandedIds[partner.id];
  const hasVisibleChildren = partner.children && partner.children.length > 0;

  return (
    <div className="flex flex-col items-center relative min-w-[140px] animate-in zoom-in-95 duration-300">
      {/* Conector Superior (Vertical + Horizontal Bridge) */}
      {depth > 1 && (
        <div className="absolute -top-8 left-0 right-0 flex items-start">
          <div className={cn("flex-1 h-0.5 bg-slate-600", isFirst && "bg-transparent")} />
          <div className="w-0.5 h-8 bg-slate-600" />
          <div className={cn("flex-1 h-0.5 bg-slate-600", isLast && "bg-transparent")} />
        </div>
      )}
      
      {/* Node */}
      <div 
        className={cn(
          "relative z-10 w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg shadow-md border-4 border-white transition-all duration-300 cursor-pointer hover:scale-110",
          partner.partner_type === 'captador' 
            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white" 
            : partner.role === 'admin'
              ? "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white"
              : "bg-gradient-to-br from-blue-400 to-blue-600 text-white",
          partner.status === 'Ativo' ? "ring-4 ring-emerald-50" : "grayscale ring-4 ring-slate-100 shadow-inner"
        )}
        onClick={() => toggleExpand(partner.id)}
      >
        {partner.full_name?.charAt(0).toUpperCase() || 'P'}
        
        {/* Expand/Collapse Indicator */}
        <div className={cn(
          "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[12px] shadow-sm border-2 border-white font-black",
          isExpanded ? "bg-slate-800 text-white" : "bg-white text-slate-800"
        )}>
          {isExpanded ? '-' : '+'}
        </div>
      </div>

      {/* Label */}
      <div className="mt-4 flex flex-col items-center max-w-[140px]">
        <span className="text-[11px] font-bold text-slate-800 text-center line-clamp-1">{partner.full_name || 'Sem Nome'}</span>
        <span className={cn(
          "text-[8px] font-extrabold uppercase tracking-tighter px-2 py-0.5 rounded-full mt-1 border shadow-sm",
          partner.partner_type === 'captador' 
            ? "text-amber-700 bg-amber-50 border-amber-100" 
            : partner.role === 'admin'
              ? "text-indigo-700 bg-indigo-50 border-indigo-100"
              : "text-blue-700 bg-blue-50 border-blue-100"
        )}>
          {partner.partner_type === 'captador' ? 'Captador' : partner.role === 'admin' ? 'Admin' : 'Vendedor'}
        </span>
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <span className="text-[9px] font-bold text-slate-500">R$ {partner.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Vertical Line down to children */}
      {isExpanded && hasVisibleChildren && (
        <div className="w-0.5 h-8 bg-slate-600"></div>
      )}

      {/* Children Container */}
      {isExpanded && hasVisibleChildren && (
        <div className="flex justify-center gap-6 relative pt-8">
          {partner.children.map((child: any, index: number) => (
            <NetworkTreeNode 
              key={child.id} 
              partner={child} 
              depth={depth + 1} 
              toggleExpand={toggleExpand} 
              expandedIds={expandedIds}
              isFirst={index === 0}
              isLast={index === partner.children.length - 1}
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
  toggleExpand: (id: string) => void,
  expandedIds: Record<string, boolean>
}) {
  const isExpanded = !!expandedIds[partner.id];
  const hasVisibleChildren = partner.children && partner.children.length > 0;

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
      <div 
        className={cn(
          "group flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer mb-2",
          isExpanded ? "bg-slate-50 border-indigo-200 shadow-sm" : "bg-white border-slate-100 hover:border-indigo-100 hover:shadow-sm"
        )}
        onClick={() => toggleExpand(partner.id)}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm",
          partner.partner_type === 'captador' ? "bg-amber-500" : partner.role === 'admin' ? "bg-indigo-600" : "bg-blue-500"
        )}>
          {partner.full_name?.charAt(0).toUpperCase() || 'P'}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{partner.full_name || 'Sem Nome'}</span>
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border",
              partner.partner_type === 'captador' 
                ? "bg-amber-50 text-amber-700 border-amber-100" 
                : partner.role === 'admin'
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
            )}>
              {partner.partner_type === 'captador' ? 'Captador' : partner.role === 'admin' ? 'Admin' : 'Vendedor'}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
              Nível {depth}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Mail className="w-3 h-3" />
              {partner.email}
            </div>
            {partner.phone && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <Phone className="w-3 h-3" />
                {partner.phone}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Saldo</p>
            <p className="text-xs font-bold text-slate-900">R$ {partner.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className={cn(
            "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
            partner.status === 'Ativo' ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-50"
          )}>
            {partner.status}
          </div>
          <div className="text-slate-300 group-hover:text-indigo-400 transition-colors">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {isExpanded && hasVisibleChildren && (
        <div className="ml-8 space-y-1 border-l-2 border-slate-100 pl-4 animate-in slide-in-from-top-2 duration-300">
          {partner.children.map((child: any) => (
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
