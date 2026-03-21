import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Package, Edit, Trash2, X, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

export function AdminProducts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    commission_direct: '',
    commission_indicator: '',
    commission_captador: '',
    commission_lvl1: '',
    commission_lvl2: '',
    link: '',
    status: 'Ativo',
    cost: '',
    payment_type: 'avista' as 'avista' | 'parcelado',
    installment_config: null as any
  });
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setMessage({ type: 'error', text: 'Não foi possível carregar os produtos.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const productData: Database['public']['Tables']['products']['Insert'] = {
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price.replace(',', '.')),
        commission_rate: 0,
        commission_value: parseFloat(newProduct.commission_direct.replace(',', '.')) || 0,
        commission_direct: parseFloat(newProduct.commission_direct.replace(',', '.')) || 0,
        commission_indicator: parseFloat(newProduct.commission_indicator.replace(',', '.')) || 0,
        commission_captador: parseFloat(newProduct.commission_captador.replace(',', '.')) || 0,
        commission_lvl1: parseFloat(newProduct.commission_lvl1.replace(',', '.')) || 0,
        commission_lvl2: parseFloat(newProduct.commission_lvl2.replace(',', '.')) || 0,
        link: newProduct.link,
        status: newProduct.status,
        cost: parseFloat(newProduct.cost.replace(',', '.')) || 0,
        payment_type: newProduct.payment_type,
        installment_config: newProduct.installment_config
      };
      const { data, error } = await supabase.from('products').insert([productData]).select();
      if (error) throw error;
      if (data) setProducts([data[0], ...products]);
      setIsAddModalOpen(false);
      setNewProduct({ 
        name: '', 
        description: '', 
        price: '', 
        commission_direct: '', 
        commission_indicator: '',
        commission_captador: '',
        commission_lvl1: '', 
        commission_lvl2: '', 
        link: '', 
        status: 'Ativo',
        cost: '',
        payment_type: 'avista',
        installment_config: null
      });
      setMessage({ type: 'success', text: 'Produto adicionado com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      setMessage({ type: 'error', text: 'Erro ao adicionar produto.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editProduct.name,
          description: editProduct.description,
          price: editProduct.price,
          commission_value: editProduct.commission_direct,
          commission_direct: editProduct.commission_direct,
          commission_indicator: editProduct.commission_indicator,
          commission_captador: editProduct.commission_captador,
          commission_lvl1: editProduct.commission_lvl1,
          commission_lvl2: editProduct.commission_lvl2,
          link: editProduct.link,
          status: editProduct.status,
          cost: editProduct.cost,
          payment_type: editProduct.payment_type,
          installment_config: editProduct.installment_config,
        })
        .eq('id', editProduct.id);
      if (error) throw error;
      setProducts(products.map(p => p.id === editProduct.id ? editProduct : p));
      setIsEditModalOpen(false);
      setEditProduct(null);
      setMessage({ type: 'success', text: 'Produto atualizado com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao editar produto:', error);
      setMessage({ type: 'error', text: 'Erro ao editar produto.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== id));
      setMessage({ type: 'success', text: 'Produto excluído com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      setMessage({ type: 'error', text: 'Erro ao excluir produto.' });
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cadastro de Produtos</h1>
          <p className="text-slate-500 mt-1">Gerencie os produtos, preços e comissões disponíveis para os parceiros venderem.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-1.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Produto
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

      {/* Products List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar produto..." 
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
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Preço</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Comissões (V / C / N1 / N2)</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Carregando produtos...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{product.name}</div>
                          <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">{product.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                        product.status === 'Ativo' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-emerald-600 font-bold text-xs">V: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.commission_direct || 0)}</span>
                        <span className="text-amber-600 font-bold text-xs">C: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.commission_captador || 0)}</span>
                        <span className="text-blue-600 text-[10px] font-medium">N1: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.commission_lvl1 || 0)}</span>
                        <span className="text-indigo-500 text-[10px] font-medium">N2: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.commission_lvl2 || 0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditProduct(product); setIsEditModalOpen(true); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50" title="Editar">
                            <Edit className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Excluir">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Adicionar Novo Produto</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
              <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700">Nome do Produto</label>
                    <input 
                      type="text" 
                      required
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="Ex: Plano Premium Anual"
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700">Descrição</label>
                    <textarea 
                      rows={2}
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      placeholder="Descreva o produto..."
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all resize-none"
                    ></textarea>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Preço (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      placeholder="0,00"
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Custo (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={newProduct.cost}
                      onChange={e => setNewProduct({...newProduct, cost: e.target.value})}
                      placeholder="0,00"
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <select 
                      value={newProduct.status}
                      onChange={e => setNewProduct({...newProduct, status: e.target.value})}
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tipo de Pagamento</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setNewProduct({...newProduct, payment_type: 'avista', installment_config: null})}
                        className={cn(
                          "flex-1 py-2 px-4 rounded-xl border-2 transition-all font-bold text-sm",
                          newProduct.payment_type === 'avista' 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm" 
                            : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        À Vista
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const config = Array.from({length: 13}, (_, i) => ({
                            label: i === 0 ? 'Entrada' : `Parcela ${i}`,
                            value: 0,
                            commissions: { direct: 0, indicator: 0, captador: 0, lvl1: 0, lvl2: 0 }
                          }));
                          setNewProduct({...newProduct, payment_type: 'parcelado', installment_config: config});
                        }}
                        className={cn(
                          "flex-1 py-2 px-4 rounded-xl border-2 transition-all font-bold text-sm",
                          newProduct.payment_type === 'parcelado' 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm" 
                            : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        Boleto Parcelado
                      </button>
                    </div>
                  </div>

                  {newProduct.payment_type === 'avista' ? (
                    <>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Venda Direta (Vendedor)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={newProduct.commission_direct}
                          onChange={e => setNewProduct({...newProduct, commission_direct: e.target.value})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Venda Direta (Indicador)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={newProduct.commission_indicator}
                          onChange={e => setNewProduct({...newProduct, commission_indicator: e.target.value})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Venda Direta (Captador)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={newProduct.commission_captador}
                          onChange={e => setNewProduct({...newProduct, commission_captador: e.target.value})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                        />
                      </div>

                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Nível 1 (Vendedor)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={newProduct.commission_lvl1}
                          onChange={e => setNewProduct({...newProduct, commission_lvl1: e.target.value})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Nível 2 (Vendedor)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={newProduct.commission_lvl2}
                          onChange={e => setNewProduct({...newProduct, commission_lvl2: e.target.value})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2 space-y-4">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 overflow-x-auto">
                        <table className="w-full text-[10px] text-left">
                          <thead>
                            <tr className="text-slate-400 font-bold uppercase tracking-wider">
                              <th className="px-2 py-2">Item</th>
                              <th className="px-2 py-2 w-20">Valor</th>
                              <th className="px-2 py-2 w-20">
                                <div className="flex items-center gap-1">
                                  Vend.
                                  <button 
                                    type="button"
                                    title="Replicar valores da 1ª linha para todas"
                                    onClick={() => {
                                      const first = newProduct.installment_config[0];
                                      const newConfig = newProduct.installment_config.map((inst: any) => ({
                                        ...inst,
                                        commissions: { ...first.commissions }
                                      }));
                                      setNewProduct({...newProduct, installment_config: newConfig});
                                    }}
                                    className="p-0.5 hover:bg-slate-200 rounded text-indigo-600"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                  </button>
                                </div>
                              </th>
                              <th className="px-2 py-2 w-20">Ind.</th>
                              <th className="px-2 py-2 w-20">Capt.</th>
                              <th className="px-2 py-2 w-20">Nível 1</th>
                              <th className="px-2 py-2 w-20">Nível 2</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {newProduct.installment_config?.map((inst: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-2 py-2 font-bold text-slate-600">{inst.label}</td>
                                <td className="px-2 py-2">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.value}
                                    onChange={e => {
                                      const newConfig = [...newProduct.installment_config];
                                      newConfig[idx].value = parseFloat(e.target.value) || 0;
                                      setNewProduct({...newProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2 text-emerald-600">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.commissions.direct}
                                    onChange={e => {
                                      const newConfig = [...newProduct.installment_config];
                                      newConfig[idx].commissions.direct = parseFloat(e.target.value) || 0;
                                      setNewProduct({...newProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2 text-amber-600">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.commissions.indicator}
                                    onChange={e => {
                                      const newConfig = [...newProduct.installment_config];
                                      newConfig[idx].commissions.indicator = parseFloat(e.target.value) || 0;
                                      setNewProduct({...newProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2 text-indigo-600">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.commissions.captador}
                                    onChange={e => {
                                      const newConfig = [...newProduct.installment_config];
                                      newConfig[idx].commissions.captador = parseFloat(e.target.value) || 0;
                                      setNewProduct({...newProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2 text-blue-500">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.commissions.lvl1}
                                    onChange={e => {
                                      const newConfig = [...newProduct.installment_config];
                                      newConfig[idx].commissions.lvl1 = parseFloat(e.target.value) || 0;
                                      setNewProduct({...newProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2 text-indigo-400">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.commissions.lvl2}
                                    onChange={e => {
                                      const newConfig = [...newProduct.installment_config];
                                      newConfig[idx].commissions.lvl2 = parseFloat(e.target.value) || 0;
                                      setNewProduct({...newProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700">Link de Checkout</label>
                    <input 
                      type="url" 
                      value={newProduct.link}
                      onChange={e => setNewProduct({...newProduct, link: e.target.value})}
                      placeholder="https://..."
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-1.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button type="submit" disabled={loading} className="px-5 py-1.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {loading ? 'Salvando...' : 'Salvar Produto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && editProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Editar Produto</h2>
              <button 
                onClick={() => { setIsEditModalOpen(false); setEditProduct(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
              <form onSubmit={handleEditProduct} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700">Nome do Produto</label>
                    <input 
                      type="text" 
                      required
                      value={editProduct.name}
                      onChange={e => setEditProduct({...editProduct, name: e.target.value})}
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700">Descrição</label>
                    <textarea 
                      rows={2}
                      value={editProduct.description || ''}
                      onChange={e => setEditProduct({...editProduct, description: e.target.value})}
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all resize-none"
                    ></textarea>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Preço (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={editProduct.price}
                      onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})}
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Custo (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={editProduct.cost || 0}
                      onChange={e => setEditProduct({...editProduct, cost: parseFloat(e.target.value)})}
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <select 
                      value={editProduct.status}
                      onChange={e => setEditProduct({...editProduct, status: e.target.value})}
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tipo de Pagamento</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setEditProduct({...editProduct, payment_type: 'avista', installment_config: null})}
                        className={cn(
                          "flex-1 py-2 px-4 rounded-xl border-2 transition-all font-bold text-sm",
                          editProduct.payment_type === 'avista' 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm" 
                            : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        À Vista
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const config = Array.from({length: 13}, (_, i) => ({
                            label: i === 0 ? 'Entrada' : `Parcela ${i}`,
                            value: 0,
                            commissions: { direct: 0, indicator: 0, captador: 0, lvl1: 0, lvl2: 0 }
                          }));
                          setEditProduct({...editProduct, payment_type: 'parcelado', installment_config: config});
                        }}
                        className={cn(
                          "flex-1 py-2 px-4 rounded-xl border-2 transition-all font-bold text-sm",
                          editProduct.payment_type === 'parcelado' 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm" 
                            : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        Boleto Parcelado
                      </button>
                    </div>
                  </div>

                  {editProduct.payment_type === 'avista' ? (
                    <>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Venda Direta (Vendedor)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={editProduct.commission_direct || 0}
                          onChange={e => setEditProduct({...editProduct, commission_direct: parseFloat(e.target.value)})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Venda Direta (Indicador)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={editProduct.commission_indicator || 0}
                          onChange={e => setEditProduct({...editProduct, commission_indicator: parseFloat(e.target.value)})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Venda Direta (Captador)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={editProduct.commission_captador || 0}
                          onChange={e => setEditProduct({...editProduct, commission_captador: parseFloat(e.target.value)})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Nível 1 (Vendedor)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={editProduct.commission_lvl1 || 0}
                          onChange={e => setEditProduct({...editProduct, commission_lvl1: parseFloat(e.target.value)})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Nível 2 (Vendedor)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={editProduct.commission_lvl2 || 0}
                          onChange={e => setEditProduct({...editProduct, commission_lvl2: parseFloat(e.target.value)})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2 space-y-4">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 overflow-x-auto">
                        <table className="w-full text-[10px] text-left">
                          <thead>
                            <tr className="text-slate-400 font-bold uppercase tracking-wider">
                              <th className="px-2 py-2">Item</th>
                              <th className="px-2 py-2 w-20">Valor</th>
                              <th className="px-2 py-2 w-20">
                                <div className="flex items-center gap-1">
                                  Vend.
                                  <button 
                                    type="button"
                                    title="Replicar valores da 1ª linha para todas"
                                    onClick={() => {
                                      const config = editProduct.installment_config as any[];
                                      if (!config || config.length === 0) return;
                                      const first = config[0];
                                      const newConfig = config.map((inst: any) => ({
                                        ...inst,
                                        commissions: { ...first.commissions }
                                      }));
                                      setEditProduct({...editProduct, installment_config: newConfig});
                                    }}
                                    className="p-0.5 hover:bg-slate-200 rounded text-indigo-600"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                  </button>
                                </div>
                              </th>
                              <th className="px-2 py-2 w-20">Ind.</th>
                              <th className="px-2 py-2 w-20">Capt.</th>
                              <th className="px-2 py-2 w-20">Nível 1</th>
                              <th className="px-2 py-2 w-20">Nível 2</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {(editProduct.installment_config as any[])?.map((inst: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-2 py-2 font-bold text-slate-600">{inst.label}</td>
                                <td className="px-2 py-2">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.value}
                                    onChange={e => {
                                      const newConfig = [...(editProduct.installment_config as any[])];
                                      newConfig[idx].value = parseFloat(e.target.value) || 0;
                                      setEditProduct({...editProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2 text-emerald-600">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.commissions.direct}
                                    onChange={e => {
                                      const newConfig = [...(editProduct.installment_config as any[])];
                                      newConfig[idx].commissions.direct = parseFloat(e.target.value) || 0;
                                      setEditProduct({...editProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2 text-amber-600">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.commissions.indicator}
                                    onChange={e => {
                                      const newConfig = [...(editProduct.installment_config as any[])];
                                      newConfig[idx].commissions.indicator = parseFloat(e.target.value) || 0;
                                      setEditProduct({...editProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2 text-indigo-600">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.commissions.captador}
                                    onChange={e => {
                                      const newConfig = [...(editProduct.installment_config as any[])];
                                      newConfig[idx].commissions.captador = parseFloat(e.target.value) || 0;
                                      setEditProduct({...editProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2 text-blue-500">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.commissions.lvl1}
                                    onChange={e => {
                                      const newConfig = [...(editProduct.installment_config as any[])];
                                      newConfig[idx].commissions.lvl1 = parseFloat(e.target.value) || 0;
                                      setEditProduct({...editProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2 text-indigo-400">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={inst.commissions.lvl2}
                                    onChange={e => {
                                      const newConfig = [...(editProduct.installment_config as any[])];
                                      newConfig[idx].commissions.lvl2 = parseFloat(e.target.value) || 0;
                                      setEditProduct({...editProduct, installment_config: newConfig});
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700">Link de Checkout</label>
                    <input 
                      type="url" 
                      value={editProduct.link || ''}
                      onChange={e => setEditProduct({...editProduct, link: e.target.value})}
                      className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => { setIsEditModalOpen(false); setEditProduct(null); }} className="px-5 py-1.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button type="submit" disabled={loading} className="px-5 py-1.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
