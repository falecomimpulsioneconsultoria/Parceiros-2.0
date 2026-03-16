import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Mail, Phone, QrCode, Link as LinkIcon, UserPlus, CheckCircle2, Clock, X, Package, FileText, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  products?: { name: string } | null;
  profiles?: { full_name: string, email: string } | null;
};
type Product = Database['public']['Tables']['products']['Row'];

export function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Lead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    product_id: '',
    status: 'Lead',
    value: ''
  });

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      fetchData();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();
      
      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch products for the dropdown
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'Ativo');
      
      if (productsData) setProducts(productsData);

      // Fetch leads
      let query = supabase
        .from('leads')
        .select(`
          *,
          products (name),
          profiles (full_name, email)
        `)
        .order('created_at', { ascending: false });
      
      // If not admin, only show own leads
      if (!isAdmin) {
        query = query.eq('partner_id', user?.id);
      }

      const { data: leadsData, error } = await query;
      
      if (error) throw error;
      setLeads(leadsData as Lead[] || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setMessage({ type: 'error', text: 'Não foi possível carregar os clientes.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (selectedClient) {
        // Update
        const updateData: Database['public']['Tables']['leads']['Update'] = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          product_id: formData.product_id || null,
          status: formData.status,
          value: parseFloat(formData.value.replace(',', '.')) || 0
        };
        const { error } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', selectedClient.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Cliente atualizado com sucesso!' });
      } else {
        // Insert
        const insertData: Database['public']['Tables']['leads']['Insert'] = {
          partner_id: user?.id as string,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          product_id: formData.product_id || null,
          status: formData.status,
          value: parseFloat(formData.value.replace(',', '.')) || 0
        };
        const { error } = await supabase
          .from('leads')
          .insert([insertData]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Cliente adicionado com sucesso!' });
      }

      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      fetchData(); // Refresh list
      resetForm();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar cliente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLeads(leads.filter(l => l.id !== id));
      setIsEditModalOpen(false);
      setMessage({ type: 'success', text: 'Cliente excluído com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      setMessage({ type: 'error', text: 'Erro ao excluir cliente.' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      product_id: '',
      status: 'Lead',
      value: ''
    });
    setSelectedClient(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (client: Lead) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      product_id: client.product_id || '',
      status: client.status,
      value: client.value.toString()
    });
    setIsEditModalOpen(true);
  };

  const filteredClients = leads.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.products?.name && c.products.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Fechado': return 'bg-emerald-100 text-emerald-700';
      case 'Em Negociação': return 'bg-amber-100 text-amber-700';
      case 'Lead': return 'bg-blue-100 text-blue-700';
      case 'Perdido': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Calculate stats
  const totalClients = leads.length;
  const closedDeals = leads.filter(l => l.status === 'Fechado').length;
  const inNegotiation = leads.filter(l => l.status === 'Em Negociação').length;

  const clientStats = [
    { label: 'Total de Clientes', value: totalClients.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Negócios Fechados', value: closedDeals.toString(), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Em Negociação', value: inNegotiation.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Clientes</h1>
          <p className="text-slate-500 mt-1">Gerencie sua carteira de clientes e acompanhe as negociações.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Novo Cliente
        </button>
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
        {clientStats.map((stat) => (
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

      {/* Clients List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Lista de Clientes</h2>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar cliente ou produto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full"
              />
            </div>
            <button className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Indicado por</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Carregando clientes...
                  </td>
                </tr>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <tr 
                    key={client.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => openEditModal(client)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{client.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center"><Mail className="w-3 h-3 mr-1.5 text-slate-400" /> {client.email}</span>
                        {client.phone && <span className="flex items-center"><Phone className="w-3 h-3 mr-1.5 text-slate-400" /> {client.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700 font-medium">
                          {client.profiles?.full_name || client.profiles?.email || 'Desconhecido'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{client.products?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                        getStatusStyle(client.status)
                      )}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(client.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Client Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {isEditModalOpen ? 'Detalhes do Cliente' : 'Adicionar Novo Cliente'}
              </h3>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveLead}>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Informações Pessoais */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Informações Pessoais
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Nome Completo</label>
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">E-mail</label>
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Telefone / WhatsApp</label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                      />
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
                      <label className="text-xs font-medium text-slate-500">Status</label>
                      <select 
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      >
                        <option value="Lead">Lead</option>
                        <option value="Em Negociação">Em Negociação</option>
                        <option value="Fechado">Fechado</option>
                        <option value="Perdido">Perdido</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Produto de Interesse</label>
                      <select 
                        value={formData.product_id}
                        onChange={e => setFormData({...formData, product_id: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      >
                        <option value="">Selecione um produto...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Valor Estimado (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.value}
                        onChange={e => setFormData({...formData, value: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                {isEditModalOpen && selectedClient ? (
                  <button 
                    type="button"
                    onClick={() => handleDeleteLead(selectedClient.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Excluir Cliente
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsEditModalOpen(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Salvar Cliente'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
