import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MoreHorizontal, Plus, Calendar, DollarSign, User, X, Users, Package, Link as LinkIcon, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  products?: { name: string } | null;
  profiles?: { full_name: string | null; email: string } | null;
};

type Column = {
  id: string;
  title: string;
  taskIds: string[];
  color: string;
};

type BoardData = {
  tasks: Record<string, Lead>;
  columns: Record<string, Column>;
  columnOrder: string[];
};

const COLUMNS_CONFIG = [
  { id: 'Lead', title: 'Leads', color: 'bg-slate-100 border-slate-200 text-slate-700' },
  { id: 'Em Negociação', title: 'Em Negociação', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'Fechado', title: 'Fechado', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'Perdido', title: 'Perdido', color: 'bg-red-50 border-red-200 text-red-700' },
];

export function FunnelPage() {
  const { user } = useAuth();
  const [data, setData] = useState<BoardData>({ tasks: {}, columns: {}, columnOrder: [] });
  const [selectedTask, setSelectedTask] = useState<Lead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select(`
          *,
          products (name),
          profiles (full_name, email)
        `)
        .eq('partner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tasks: Record<string, Lead> = {};
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
      (leadsData || []).forEach(lead => {
        tasks[lead.id] = lead;
        if (columns[lead.status]) {
          columns[lead.status].taskIds.push(lead.id);
        } else {
          // Fallback if status doesn't match
          if (!columns['Lead']) {
            columns['Lead'] = { id: 'Lead', title: 'Leads', taskIds: [], color: 'bg-slate-100 border-slate-200 text-slate-700' };
          }
          columns['Lead'].taskIds.push(lead.id);
        }
      });

      setData({
        tasks,
        columns,
        columnOrder: COLUMNS_CONFIG.map(c => c.id)
      });
    } catch (error) {
      console.error('Erro ao buscar leads para o funil:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (task: Lead) => {
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
      const updateData: Database['public']['Tables']['leads']['Update'] = { status: finishColumn.id };
      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', draggableId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error);
      // Revert optimistic update on error
      fetchLeads();
    }
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Funil de Vendas</h1>
          <p className="text-slate-500 mt-1">Gerencie o fluxo de negociações arrastando os cards entre as etapas.</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full min-w-max items-start">
            {data.columnOrder.map((columnId) => {
              const column = data.columns[columnId];
              const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);

              return (
                <div key={column.id} className="w-80 flex flex-col h-full max-h-full">
                  {/* Column Header */}
                  <div className={cn("px-4 py-3 rounded-t-xl border-t border-x font-semibold flex items-center justify-between", column.color)}>
                    <div className="flex items-center gap-2">
                      <span>{column.title}</span>
                      <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold">
                        {tasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 p-3 rounded-b-xl border-b border-x bg-slate-50/50 transition-colors overflow-y-auto",
                          column.color.replace('bg-', 'border-').split(' ')[1], // Keep border color
                          snapshot.isDraggingOver ? "bg-slate-100" : ""
                        )}
                      >
                        <div className="space-y-3 min-h-[150px]">
                          {tasks.map((task, index) => (
                            // @ts-expect-error - React 19 key prop issue with dnd library
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => openEditModal(task)}
                                  className={cn(
                                    "bg-white p-4 rounded-lg shadow-sm border border-slate-200 group hover:border-indigo-300 transition-colors cursor-pointer",
                                    snapshot.isDragging ? "shadow-lg ring-2 ring-indigo-500/20 rotate-2" : ""
                                  )}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-slate-900 text-sm">{task.name}</h4>
                                  </div>
                                  
                                  <div className="text-sm text-slate-600 mb-3 font-medium">
                                    {task.products?.name || 'Sem produto'}
                                  </div>

                                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                                    <div className="flex items-center font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                      <DollarSign className="w-3 h-3 mr-0.5" />
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(task.value)}
                                    </div>
                                    <div className="flex items-center">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {new Date(task.created_at).toLocaleDateString('pt-BR')}
                                    </div>
                                  </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Detalhes da Oportunidade</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Informações Pessoais */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Informações do Cliente
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Nome do Cliente</label>
                    <input type="text" readOnly value={selectedTask.name} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Email</label>
                    <input type="text" readOnly value={selectedTask.email} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Informações do Negócio */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Informações do Negócio
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Produto</label>
                    <input type="text" readOnly value={selectedTask.products?.name || 'N/A'} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Valor</label>
                    <input type="text" readOnly value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTask.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsEditModalOpen(false)}
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
