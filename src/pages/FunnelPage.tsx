import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MoreHorizontal, Plus, Calendar, DollarSign, User, X, Users, Package, Link as LinkIcon, FileText, Clock, PlayCircle, PauseCircle, CheckCircle, XCircle, Info, ExternalLink, AlertCircle, Copy } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Deal = Database['public']['Tables']['lead_deals']['Row'] & {
  leads: Database['public']['Tables']['leads']['Row'];
  products?: { name: string } | null;
};

type Column = {
  id: string;
  title: string;
  taskIds: string[];
  color: string;
};

type BoardData = {
  tasks: Record<string, Deal>;
  columns: Record<string, Column>;
  columnOrder: string[];
};

const COLUMNS_CONFIG = [
  { id: 'Lead', title: 'Leads', color: 'bg-slate-100 border-slate-200 text-slate-700' },
  { id: 'Em Negociação', title: 'Em Negociação', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'Fechado', title: 'Fechado', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'Perdido', title: 'Perdido', color: 'bg-red-50 border-red-200 text-red-700' },
];

const EXECUTION_STATUS_STYLE: Record<string, { color: string, icon: any }> = {
  'A iniciar':    { color: 'bg-slate-100 text-slate-700',   icon: Clock },
  'Em andamento': { color: 'bg-blue-100 text-blue-700',    icon: PlayCircle },
  'Pendenciado':  { color: 'bg-amber-100 text-amber-700',   icon: PauseCircle },
  'Concluido':    { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  'Cancelado':    { color: 'bg-red-100 text-red-700',      icon: XCircle },
};

export function FunnelPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [data, setData] = useState<BoardData>({ tasks: {}, columns: {}, columnOrder: [] });
  const [selectedTask, setSelectedTask] = useState<Deal | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchDeals();
      checkAdmin();
    }
  }, [user]);

  const checkAdmin = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();
    setIsAdmin(profile?.role === 'admin');
  };

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const { data: dealsData, error } = await supabase
        .from('lead_deals')
        .select(`
          *,
          leads (*),
          products (name)
        `)
        .eq('partner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tasks: Record<string, Deal> = {};
      const columns: Record<string, Column> = {};

      // Initialize columns
      COLUMNS_CONFIG.forEach(col => {
        columns[col.id] = {
          id: col.id,
          title: col.title,
          taskIds: [],
          color: col.color
        };
      });

      // Populate tasks and column taskIds
      (dealsData || []).forEach(deal => {
        tasks[deal.id] = deal as Deal;
        const status = deal.status || 'Lead';
        if (columns[status]) {
          columns[status].taskIds.push(deal.id);
        } else {
          if (!columns['Lead']) {
            columns['Lead'] = { id: 'Lead', title: 'Leads', taskIds: [], color: 'bg-slate-100 border-slate-200 text-slate-700' };
          }
          columns['Lead'].taskIds.push(deal.id);
        }
      });

      setData({
        tasks,
        columns,
        columnOrder: COLUMNS_CONFIG.map(c => c.id)
      });
    } catch (error) {
      console.error('Erro ao buscar negócios para o funil:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (task: Deal) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    // Moving within the same column
    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...startColumn,
        taskIds: newTaskIds,
      };

      setData({
        ...data,
        columns: {
          ...data.columns,
          [newColumn.id]: newColumn,
        },
      });
      return;
    }

    // Moving from one column to another
    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = {
      ...startColumn,
      taskIds: startTaskIds,
    };

    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = {
      ...finishColumn,
      taskIds: finishTaskIds,
    };

    // Optimistic UI update
    setData({
      ...data,
      columns: {
        ...data.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      },
      tasks: {
        ...data.tasks,
        [draggableId]: {
          ...data.tasks[draggableId],
          status: finishColumn.id
        }
      }
    });

    // Update in Supabase
    try {
      const { error } = await supabase
        .from('lead_deals')
        .update({ status: finishColumn.id })
        .eq('id', draggableId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao atualizar status do negócio:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar status do negócio.' });
      setTimeout(() => setMessage(null), 5000);
      fetchDeals();
    }
  };

  const copyTrackingLink = (leadId: string) => {
    const link = `${window.location.origin}/acompanhar/${leadId}`;
    navigator.clipboard.writeText(link);
    setMessage({ type: 'success', text: 'Link de acompanhamento copiado!' });
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center text-slate-500">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          Carregando funil...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-0 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <Package className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Funnel de Negócios</h1>
            <p className="text-slate-400 text-sm font-medium mt-0.5">Gerencie suas vendas acompanhando cada negócio individualmente.</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={cn(
          "mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300",
          message.type === 'success' ? "bg-emerald-50/50 border border-emerald-100 text-emerald-800" : "bg-red-50/50 border border-red-100 text-red-800"
        )}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-8 h-full min-w-max items-start">
            {data.columnOrder.map((columnId) => {
              const column = data.columns[columnId];
              const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);

              return (
                <div key={column.id} className="w-80 flex flex-col h-full max-h-full">
                  {/* Column Header */}
                  {(() => {
                    const columnTotal = tasks.reduce((sum, task) => sum + (task?.value || 0), 0);
                    return (
                      <div className="px-5 py-4 flex flex-col gap-2 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-600 uppercase tracking-widest">{column.title}</span>
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                              {tasks.length}
                            </span>
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-slate-800 flex items-center gap-1">
                          <span className="text-slate-300 text-sm">R$</span>
                          {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(columnTotal)}
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div className={cn("h-full transition-all duration-500", 
                            column.id === 'Lead' ? 'bg-slate-400 w-1/4' :
                            column.id === 'Em Negociação' ? 'bg-indigo-400 w-2/4' :
                            column.id === 'Fechado' ? 'bg-emerald-400 w-full' : 'bg-red-400 w-full'
                          )} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Droppable Area */}
                  <Droppable droppableId={column.id} isDropDisabled={column.id === 'Fechado' && !isAdmin}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 p-4 rounded-[2rem] bg-slate-50/50 border border-slate-100/50 transition-all duration-300 overflow-y-auto custom-scrollbar",
                          snapshot.isDraggingOver ? "bg-indigo-50/30 ring-2 ring-indigo-500/10 border-indigo-100" : ""
                        )}
                      >
                        <div className="space-y-4 min-h-[150px]">
                          {tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => openEditModal(task)}
                                  className={cn(
                                    "bg-white p-5 rounded-2xl shadow-sm border border-slate-100/80 group hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer relative overflow-hidden",
                                    snapshot.isDragging ? "shadow-2xl ring-4 ring-indigo-500/10 rotate-2 border-indigo-500" : ""
                                  )}
                                >
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                      <h4 className="font-semibold text-slate-800 text-sm truncate uppercase tracking-tight">
                                        {task.leads?.name || 'Venda Avulsa'}
                                      </h4>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyTrackingLink(task.leads?.id || '');
                                        }}
                                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                                        title="Copiar Link de Acompanhamento"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    
                                    {/* Info Produto */}
                                    <div className="bg-slate-50/80 rounded-xl p-3 mb-4">
                                      <div className="flex items-center gap-2 text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1.5">
                                        <Package className="w-3 h-3" />
                                        {task.products?.name || 'Produto indonhecido'}
                                      </div>
                                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                                        {task.payment_method ? (
                                          <>
                                            <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                            Pago via {task.payment_method}
                                          </>
                                        ) : (
                                          <>
                                            <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                            Pagamento não definido
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Badge de Execução */}
                                    <div className="flex items-center gap-2 mb-5">
                                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-tighter border shadow-sm",
                                        EXECUTION_STATUS_STYLE[task.execution_status || 'A iniciar']?.color.replace('text-', 'border-').replace('100', '200/50').split(' ')[0],
                                        EXECUTION_STATUS_STYLE[task.execution_status || 'A iniciar']?.color || 'bg-slate-50 text-slate-500 border-slate-200')}>
                                        {(() => {
                                          const Icon = EXECUTION_STATUS_STYLE[task.execution_status || 'A iniciar']?.icon || Clock;
                                          return <Icon className="w-2.5 h-2.5" />;
                                        })()}
                                        {task.execution_status || 'A iniciar'}
                                      </span>
                                      {(task.execution_status === 'Pendenciado' && task.pending_description) && (
                                        <div className="w-5 h-5 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
                                          <AlertCircle className="w-3 h-3 text-amber-500" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-50">
                                      <div className="flex items-center font-semibold text-slate-900 text-sm">
                                        <span className="text-[10px] text-slate-300 mr-0.5">R$</span>
                                        {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(task.value)}
                                      </div>
                                      <div className="flex items-center text-[10px] font-medium">
                                        <Calendar className="w-3 h-3 mr-1 text-slate-300" />
                                        {new Date(task.created_at).toLocaleDateString('pt-BR')}
                                      </div>
                                    </div>
                                    
                                    {snapshot.isDragging && (
                                      <div className="absolute inset-0 bg-indigo-600/5 backdrop-blur-[1px]" />
                                    )}
                                  </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Edit Task Modal */}
      {isEditModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[4px] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Detalhes do Negócio</h3>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Visualização completa do contrato</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-300 hover:text-slate-900 transition-all p-2 rounded-xl hover:bg-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Informações Pessoais */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-4 bg-indigo-900/60 rounded-full" />
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    Informações do Cliente
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Nome Completo</label>
                    <div className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600">
                      {selectedTask.leads?.name || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Contato Principal</label>
                    <div className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600">
                      {selectedTask.leads?.email || selectedTask.leads?.phone || 'N/A'}
                    </div>
                  </div>
                </div>
              </section>

              {/* Informações do Negócio */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-4 bg-indigo-900/60 rounded-full" />
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    Parâmetros do Negócio
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Produto Contratado</label>
                    <div className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800">
                      {selectedTask.products?.name || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Valor do Contrato</label>
                    <div className="w-full bg-emerald-50/30 border border-emerald-100/50 rounded-xl px-4 py-3 text-sm font-bold text-emerald-600 tabular-nums">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTask.value)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Forma de Pagamento</label>
                    <div className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600">
                      {selectedTask.payment_method || 'Não informado'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Data de Lançamento</label>
                    <div className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600">
                      {new Date(selectedTask.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Notas da Operação</label>
                  <div className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium text-slate-600 italic leading-relaxed min-h-[100px]">
                    {selectedTask.notes || 'Nenhuma nota adicional registrada para este negócio.'}
                  </div>
                </div>
              </section>

              {/* Status de Execução */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-4 bg-indigo-900/60 rounded-full" />
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    Status de Execução / Entrega
                  </h4>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <span className={cn("inline-flex items-center gap-2.5 px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest border shadow-sm",
                      EXECUTION_STATUS_STYLE[selectedTask.execution_status || 'A iniciar']?.color || 'bg-white text-slate-500 border-slate-200')}>
                      {(() => {
                        const Icon = EXECUTION_STATUS_STYLE[selectedTask.execution_status || 'A iniciar']?.icon || Clock;
                        return <Icon className="w-4 h-4" />;
                      })()}
                      {selectedTask.execution_status || 'A iniciar'}
                    </span>
                  </div>

                  {selectedTask.execution_status === 'Pendenciado' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2 text-amber-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <p className="text-[10px] font-bold uppercase tracking-wider">Motivo da Pendência</p>
                        </div>
                        <p className="text-sm text-amber-900 leading-relaxed font-medium">
                          {selectedTask.pending_description || 'Descrição detalhada não fornecida.'}
                        </p>
                      </div>
                      
                      {selectedTask.pending_document_url && (
                        <a 
                          href={selectedTask.pending_document_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                              <ExternalLink className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-slate-700 block">Documentação Pendente</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Clique para visualizar</span>
                            </div>
                          </div>
                          <LinkIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </a>
                      )}
                    </div>
                  )}

                  {selectedTask.execution_status === 'Concluido' && (
                    <div className="flex items-center gap-4 p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-800">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shadow-sm">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-tight">Venda Concluída</p>
                        <p className="text-xs text-emerald-600/80 font-medium">Este contrato foi finalizado e entregue com sucesso.</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
            
            <div className="p-8 bg-slate-50/50 backdrop-blur-sm border-t border-slate-100 flex justify-end items-center">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-8 py-3 bg-slate-900 text-white text-[11px] font-semibold rounded-xl hover:bg-black shadow-sm transition-all uppercase tracking-[0.1em] active:scale-[0.98]"
              >
                Entendido e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
