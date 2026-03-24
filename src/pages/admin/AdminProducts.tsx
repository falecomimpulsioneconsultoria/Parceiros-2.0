import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Package, Edit, Trash2, X, Link as LinkIcon, AlertCircle, CheckCircle2, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConfirmDialog } from '../../components/ConfirmDialog';
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
    installments_count: 12,
    installment_config: null as any,
    image_url: ''
  });
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const editFileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (newProduct.payment_type === 'parcelado' && Array.isArray(newProduct.installment_config)) {
      const sum = (newProduct.installment_config as any[]).reduce((acc: number, curr: any) => {
        const val = typeof curr.value === 'string' ? parseFloat(curr.value.replace(',', '.')) : curr.value;
        return acc + (val || 0);
      }, 0);
      setNewProduct(prev => ({ ...prev, price: String(sum.toFixed(2)).replace('.', ',') }));
    }
  }, [newProduct.installment_config, newProduct.payment_type]);

  useEffect(() => {
    if (editProduct && editProduct.payment_type === 'parcelado' && Array.isArray(editProduct.installment_config)) {
      const sum = (editProduct.installment_config as any[]).reduce((acc: number, curr: any) => {
        const val = typeof curr.value === 'string' ? parseFloat(curr.value.replace(',', '.')) : curr.value;
        return acc + (val || 0);
      }, 0);
      setEditProduct((prev: any) => prev ? { ...prev, price: sum } : prev);
    }
  }, [editProduct?.installment_config, editProduct?.payment_type]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      setUploadingImage(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `prod-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      
      if (isEdit && editProduct) {
        setEditProduct({ ...editProduct, image_url: publicUrl });
      } else {
        setNewProduct({ ...newProduct, image_url: publicUrl });
      }
      
      setMessage({ type: 'success', text: 'Imagem carregada com sucesso!' });
    } catch (error: any) {
      console.error('Erro no upload da imagem:', error);
      setMessage({ type: 'error', text: 'Erro ao fazer upload: ' + error.message });
    } finally {
      setUploadingImage(false);
      setTimeout(() => setMessage(null), 3000);
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
        installments_count: newProduct.installments_count,
        installment_config: newProduct.payment_type === 'parcelado' && Array.isArray(newProduct.installment_config) 
          ? (newProduct.installment_config as any[]).map(inst => ({
              ...inst,
              value: typeof inst.value === 'string' ? parseFloat(String(inst.value).replace(',', '.')) || 0 : inst.value,
              commissions: {
                direct: typeof inst.commissions?.direct === 'string' ? parseFloat(String(inst.commissions.direct).replace(',', '.')) || 0 : inst.commissions?.direct || 0,
                indicator: typeof inst.commissions?.indicator === 'string' ? parseFloat(String(inst.commissions.indicator).replace(',', '.')) || 0 : inst.commissions?.indicator || 0,
                captador: typeof inst.commissions?.captador === 'string' ? parseFloat(String(inst.commissions.captador).replace(',', '.')) || 0 : inst.commissions?.captador || 0,
                lvl1: typeof inst.commissions?.lvl1 === 'string' ? parseFloat(String(inst.commissions.lvl1).replace(',', '.')) || 0 : inst.commissions?.lvl1 || 0,
                lvl2: typeof inst.commissions?.lvl2 === 'string' ? parseFloat(String(inst.commissions.lvl2).replace(',', '.')) || 0 : inst.commissions?.lvl2 || 0,
              }
            }))
          : newProduct.installment_config,
        image_url: newProduct.image_url
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
        installment_config: null,
        image_url: ''
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
          price: typeof editProduct.price === 'string' ? parseFloat(String(editProduct.price).replace(',', '.')) || 0 : editProduct.price,
          commission_value: typeof editProduct.commission_direct === 'string' ? parseFloat(String(editProduct.commission_direct).replace(',', '.')) || 0 : editProduct.commission_direct,
          commission_direct: typeof editProduct.commission_direct === 'string' ? parseFloat(String(editProduct.commission_direct).replace(',', '.')) || 0 : editProduct.commission_direct,
          commission_indicator: typeof editProduct.commission_indicator === 'string' ? parseFloat(String(editProduct.commission_indicator).replace(',', '.')) || 0 : editProduct.commission_indicator,
          commission_captador: typeof editProduct.commission_captador === 'string' ? parseFloat(String(editProduct.commission_captador).replace(',', '.')) || 0 : editProduct.commission_captador,
          commission_lvl1: typeof editProduct.commission_lvl1 === 'string' ? parseFloat(String(editProduct.commission_lvl1).replace(',', '.')) || 0 : editProduct.commission_lvl1,
          commission_lvl2: typeof editProduct.commission_lvl2 === 'string' ? parseFloat(String(editProduct.commission_lvl2).replace(',', '.')) || 0 : editProduct.commission_lvl2,
          link: editProduct.link,
          status: editProduct.status,
          cost: typeof editProduct.cost === 'string' ? parseFloat(String(editProduct.cost).replace(',', '.')) || 0 : editProduct.cost,
          payment_type: editProduct.payment_type,
          installments_count: (editProduct as any).installments_count || 12,
          installment_config: editProduct.payment_type === 'parcelado' && Array.isArray(editProduct.installment_config) 
            ? (editProduct.installment_config as any[]).map(inst => ({
                ...inst,
                value: typeof inst.value === 'string' ? parseFloat(String(inst.value).replace(',', '.')) || 0 : inst.value,
                commissions: {
                  direct: typeof inst.commissions?.direct === 'string' ? parseFloat(String(inst.commissions.direct).replace(',', '.')) || 0 : inst.commissions?.direct || 0,
                  indicator: typeof inst.commissions?.indicator === 'string' ? parseFloat(String(inst.commissions.indicator).replace(',', '.')) || 0 : inst.commissions?.indicator || 0,
                  captador: typeof inst.commissions?.captador === 'string' ? parseFloat(String(inst.commissions.captador).replace(',', '.')) || 0 : inst.commissions?.captador || 0,
                  lvl1: typeof inst.commissions?.lvl1 === 'string' ? parseFloat(String(inst.commissions.lvl1).replace(',', '.')) || 0 : inst.commissions?.lvl1 || 0,
                  lvl2: typeof inst.commissions?.lvl2 === 'string' ? parseFloat(String(inst.commissions.lvl2).replace(',', '.')) || 0 : inst.commissions?.lvl2 || 0,
                }
              }))
            : editProduct.installment_config,
          image_url: editProduct.image_url
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

  const handleDeleteProduct = (id: string) => {
    setProductToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productToDelete));
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
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
                <th className="px-6 py-4">Comissões (V / C / I / N1 / N2)</th>
                <th className="px-6 py-4 min-w-[160px]">Comiss. (Entrada/1ª Parc)</th>
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
                        <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-slate-900">{product.name}</span>
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                              product.payment_type === 'parcelado' ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"
                            )}>
                              {product.payment_type === 'parcelado' ? 'Parcelado' : 'À Vista'}
                            </span>
                          </div>
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
                        <span className="text-purple-600 font-bold text-xs">I: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.commission_indicator || 0)}</span>
                        <span className="text-blue-600 text-[10px] font-medium">N1: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.commission_lvl1 || 0)}</span>
                        <span className="text-indigo-500 text-[10px] font-medium">N2: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.commission_lvl2 || 0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.payment_type === 'parcelado' && Array.isArray(product.installment_config) ? (
                        <div className="flex flex-col gap-1">
                          {product.installment_config[0] && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Entrada</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-emerald-600 font-bold text-[10px]">V: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product.installment_config as any)[0].commissions?.direct || 0)}</span>
                                <span className="text-amber-600 font-bold text-[10px]">C: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product.installment_config as any)[0].commissions?.captador || 0)}</span>
                                <span className="text-purple-600 font-bold text-[10px]">I: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product.installment_config as any)[0].commissions?.indicator || 0)}</span>
                                <span className="text-blue-600 text-[10px] font-medium">N1: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product.installment_config as any)[0].commissions?.lvl1 || 0)}</span>
                                <span className="text-indigo-500 text-[10px] font-medium">N2: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product.installment_config as any)[0].commissions?.lvl2 || 0)}</span>
                              </div>
                            </div>
                          )}
                          {product.installment_config[1] && (
                            <div className="flex flex-col gap-0.5 mt-1 border-t border-slate-100 pt-1">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">1ª Parcela</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-emerald-600 font-bold text-[10px]">V: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product.installment_config as any)[1].commissions?.direct || 0)}</span>
                                <span className="text-amber-600 font-bold text-[10px]">C: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product.installment_config as any)[1].commissions?.captador || 0)}</span>
                                <span className="text-purple-600 font-bold text-[10px]">I: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product.installment_config as any)[1].commissions?.indicator || 0)}</span>
                                <span className="text-blue-600 text-[10px] font-medium">N1: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product.installment_config as any)[1].commissions?.lvl1 || 0)}</span>
                                <span className="text-indigo-500 text-[10px] font-medium">N2: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product.installment_config as any)[1].commissions?.lvl2 || 0)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                         <span className="text-xs text-slate-400">—</span>
                      )}
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

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-slate-700">Imagem do Produto</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                        {newProduct.image_url ? (
                          <img src={newProduct.image_url} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={fileInputRef}
                          onChange={(e) => handleImageUpload(e, false)}
                        />
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="inline-flex items-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                          {uploadingImage ? 'Enviando...' : 'Selecionar Imagem'}
                        </button>
                        <p className="text-[10px] text-slate-500">Recomendado: 500x500px, máx 2MB.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Preço (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      disabled={newProduct.payment_type === 'parcelado'}
                      placeholder="0,00"
                      className={cn(
                        "w-full px-4 py-1.5 border hover:border-slate-300 rounded-lg focus:outline-none transition-all",
                        newProduct.payment_type === 'parcelado'
                          ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                      )}
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
                          const count = newProduct.installments_count || 12;
                          const config = Array.from({length: count + 1}, (_, i) => ({
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

                  {newProduct.payment_type === 'parcelado' && (
                    <div className="md:col-span-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">Quantidade de Parcelas (excluíndo entrada)</label>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Total de itens: {(newProduct.installments_count || 0) + 1}</span>
                      </div>
                      <input 
                        type="number" 
                        min="1"
                        max="24"
                        value={newProduct.installments_count}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 1;
                          const currentConfig = newProduct.installment_config || [];
                          const newConfig = Array.from({length: val + 1}, (_, i) => {
                            if (currentConfig[i]) return currentConfig[i];
                            return {
                              label: i === 0 ? 'Entrada' : `Parcela ${i}`,
                              value: 0,
                              commissions: { direct: 0, indicator: 0, captador: 0, lvl1: 0, lvl2: 0 }
                            };
                          });
                          setNewProduct({...newProduct, installments_count: val, installment_config: newConfig});
                        }}
                        className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                      />
                    </div>
                  )}

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
                                      newConfig[idx].value = e.target.value as any;
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
                                      newConfig[idx].commissions.direct = e.target.value as any;
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
                                      newConfig[idx].commissions.indicator = e.target.value as any;
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
                                      newConfig[idx].commissions.captador = e.target.value as any;
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
                                      newConfig[idx].commissions.lvl1 = e.target.value as any;
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
                                      newConfig[idx].commissions.lvl2 = e.target.value as any;
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

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-slate-700">Imagem do Produto</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                        {(editProduct as any).image_url ? (
                          <img src={(editProduct as any).image_url} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={editFileInputRef}
                          onChange={(e) => handleImageUpload(e, true)}
                        />
                        <button 
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="inline-flex items-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                          {uploadingImage ? 'Enviando...' : 'Trocar Imagem'}
                        </button>
                        <p className="text-[10px] text-slate-500">Recomendado: 500x500px, máx 2MB.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Preço (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={editProduct.price}
                      onChange={e => setEditProduct({...editProduct, price: e.target.value as any})}
                      disabled={editProduct.payment_type === 'parcelado'}
                      className={cn(
                        "w-full px-4 py-1.5 border hover:border-slate-300 rounded-lg focus:outline-none transition-all",
                        editProduct.payment_type === 'parcelado'
                          ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Custo (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={editProduct.cost ?? ''}
                      onChange={e => setEditProduct({...editProduct, cost: e.target.value as any})}
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
                          const count = (editProduct as any).installments_count || 12;
                          const config = Array.from({length: count + 1}, (_, i) => ({
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

                  {editProduct.payment_type === 'parcelado' && (
                    <div className="md:col-span-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">Quantidade de Parcelas (excluíndo entrada)</label>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Total de itens: {((editProduct as any).installments_count || 0) + 1}</span>
                      </div>
                      <input 
                        type="number" 
                        min="1"
                        max="24"
                        value={(editProduct as any).installments_count || 12}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 1;
                          const currentConfig = editProduct.installment_config || [];
                          const newConfig = Array.from({length: val + 1}, (_, i) => {
                            if (currentConfig[i]) return currentConfig[i];
                            return {
                              label: i === 0 ? 'Entrada' : `Parcela ${i}`,
                              value: 0,
                              commissions: { direct: 0, indicator: 0, captador: 0, lvl1: 0, lvl2: 0 }
                            };
                          });
                          setEditProduct({...editProduct, installments_count: val, installment_config: newConfig} as any);
                        }}
                        className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all"
                      />
                    </div>
                  )}

                  {editProduct.payment_type === 'avista' ? (
                    <>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Venda Direta (Vendedor)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={editProduct.commission_direct ?? ''}
                          onChange={e => setEditProduct({...editProduct, commission_direct: e.target.value as any})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Venda Direta (Indicador)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={editProduct.commission_indicator ?? ''}
                          onChange={e => setEditProduct({...editProduct, commission_indicator: e.target.value as any})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Venda Direta (Captador)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={editProduct.commission_captador ?? ''}
                          onChange={e => setEditProduct({...editProduct, commission_captador: e.target.value as any})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Nível 1 (Vendedor)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={editProduct.commission_lvl1 ?? ''}
                          onChange={e => setEditProduct({...editProduct, commission_lvl1: e.target.value as any})}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-sm font-medium text-slate-700 text-[11px]">Nível 2 (Vendedor)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={editProduct.commission_lvl2 ?? ''}
                          onChange={e => setEditProduct({...editProduct, commission_lvl2: e.target.value as any})}
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
                                      newConfig[idx].value = e.target.value as any;
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
                                      newConfig[idx].commissions.direct = e.target.value as any;
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
                                      newConfig[idx].commissions.indicator = e.target.value as any;
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
                                      newConfig[idx].commissions.captador = e.target.value as any;
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
                                      newConfig[idx].commissions.lvl1 = e.target.value as any;
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
                                      newConfig[idx].commissions.lvl2 = e.target.value as any;
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
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir Produto"
        description="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        onConfirm={confirmDeleteProduct}
        confirmText="Excluir"
        variant="destructive"
      />
    </div>
  );
}
