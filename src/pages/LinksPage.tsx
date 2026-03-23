import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, Package, QrCode, X, Plus, Link as LinkIcon, CheckCircle2, Download, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import type { Database } from '../lib/database.types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AlertCircle } from 'lucide-react';

type Product = Database['public']['Tables']['products']['Row'];

export function LinksPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [redirectPhone, setRedirectPhone] = useState('');
  const [qrName, setQrName] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [myAffiliations, setMyAffiliations] = useState<Record<string, { id: string; redirect_phone: string | null }>>({});
  const [productQRCodes, setProductQRCodes] = useState<Record<string, any[]>>({});
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [profileReferredBy, setProfileReferredBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my_products' | 'explore'>('my_products');
  const [isAffiliating, setIsAffiliating] = useState<string | null>(null);
  const [partnerType, setPartnerType] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [qrToDelete, setQrToDelete] = useState<{ id: string, affiliationId: string } | null>(null);
  const [deaffiliateConfirmOpen, setDeaffiliateConfirmOpen] = useState(false);
  const [productToDeaffiliate, setProductToDeaffiliate] = useState<Product | null>(null);
  
  const { user, role, partnerType: authPartnerType } = useAuth();
  const isCaptador = role === 'partner' && (authPartnerType?.toLowerCase() === 'captador' || partnerType?.toLowerCase() === 'captador');
  const partnerId = user?.id || '';
  const vendedorLink = `${window.location.origin}/ref/${partnerId}?type=vendedor`;
  const captadorLink = `${window.location.origin}/ref/${partnerId}?type=captador`;

  const fetchData = async () => {
    try {
      // Fetch all active products
      const { data: prods, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'Ativo')
        .order('created_at', { ascending: false });

      if (prodErr) throw prodErr;
      setAllProducts(prods || []);

      // Fetch partner's affiliated products and profile phone
      if (partnerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone, partner_type, referred_by')
          .eq('id', partnerId)
          .single();
        
        if (profile) {
          if (profile.phone) setProfilePhone(profile.phone);
          if (profile.partner_type) setPartnerType(profile.partner_type);
          if (profile.referred_by) setProfileReferredBy(profile.referred_by);
        }

        const { data: affiliations, error: affErr } = await supabase
          .from('partner_products')
          .select('id, product_id, redirect_phone')
          .eq('partner_id', partnerId);

        if (affErr) {
          console.error('Erro (ou tabela inexistente) nas afiliações:', affErr.message);
        } else {
          const affMap: Record<string, { id: string; redirect_phone: string | null }> = {};
          const affIds: string[] = [];
          affiliations?.forEach(a => {
            affMap[a.product_id] = { id: a.id, redirect_phone: a.redirect_phone };
            affIds.push(a.id);
          });
          setMyAffiliations(affMap);

          // Fetch QRCodes for these affiliations
          if (affIds.length > 0) {
            const { data: qrcodes, error: qrErr } = await supabase
              .from('product_qrcodes')
              .select('*')
              .in('partner_product_id', affIds);

            if (!qrErr && qrcodes) {
              const qrMap: Record<string, any[]> = {};
              qrcodes.forEach(qr => {
                if (!qrMap[qr.partner_product_id]) qrMap[qr.partner_product_id] = [];
                qrMap[qr.partner_product_id].push(qr);
              });
              setProductQRCodes(qrMap);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados de produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [partnerId]);

  const handleAffiliate = async (productId: string) => {
    if (!partnerId) return;
    setIsAffiliating(productId);
    try {
      const { data: affiliation, error } = await supabase
        .from('partner_products')
        .insert({ partner_id: partnerId, product_id: productId })
        .select()
        .single();
      
      if (error && error.code !== '23505') throw error;
      
      if (!error && affiliation) {
        // Criar QR Code padrão automaticamente
        await supabase
          .from('product_qrcodes')
          .insert({
            partner_product_id: affiliation.id,
            name: 'Link Padrão',
            redirect_phone: null
          });
      }
      
      // Sincroniza dados
      await fetchData();
      
      if (!error) {
        setMessage({ type: 'success', text: 'Afiliado com sucesso! O QR Code padrão foi gerado automaticamente.' });
      }
    } catch (error: any) {
      console.error('Erro ao se afiliar:', error);
      setMessage({ type: 'error', text: 'Erro ao se afiliar: ' + (error.message || '') });
    } finally {
      setIsAffiliating(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };
  
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const openQRModal = (product: Product) => {
    setSelectedProduct(product);
    setRedirectPhone(profilePhone || '');
    setQrName('');
    setIsQRModalOpen(true);
  };

  const handleAddQRCode = async () => {
    if (!selectedProduct) return;
    if (!qrName) {
      alert('Por favor, dê um nome ao seu QRCode.');
      return;
    }
    
    const affiliation = myAffiliations[selectedProduct.id];
    if (!affiliation || !affiliation.id) {
      console.error('Dados de afiliação não encontrados:', affiliation);
      setMessage({ type: 'error', text: 'Erro de sincronia: ID da afiliação não encontrado.' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('product_qrcodes')
        .insert({
          partner_product_id: affiliation.id,
          name: qrName,
          redirect_phone: redirectPhone || null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setProductQRCodes(prev => {
        const exist = prev[affiliation.id] || [];
        return { ...prev, [affiliation.id]: [...exist, data] };
      });
      setQrName('');
      setRedirectPhone(profilePhone || '');
      setMessage({ type: 'success', text: 'QR Code personalizado criado com sucesso!' });
    } catch (err: any) {
      console.error('Erro ao adicionar QR Code:', err);
      setMessage({ type: 'error', text: 'Erro ao criar QR Code.' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteQRCode = (id: string, affiliationId: string) => {
    setQrToDelete({ id, affiliationId });
    setDeleteConfirmOpen(true);
  };

  const handleDownloadQR = (qrName: string, elementId: string) => {
    const svg = document.getElementById(elementId);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Definir tamanho fixo de 600x600 para alta qualidade de impressão
      const size = 600;
      const padding = 40;
      canvas.width = size;
      canvas.height = size;
      
      if (ctx) {
        // Fundo branco
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Desenhar QR Code centralizado e escalonado
        const qrSize = size - (padding * 2);
        ctx.drawImage(img, padding, padding, qrSize, qrSize);
        
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QRCode-${qrName}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const confirmDeleteQRCode = async () => {
    if (!qrToDelete) return;
    try {
      const { error } = await supabase
        .from('product_qrcodes')
        .delete()
        .eq('id', qrToDelete.id);
      
      if (error) throw error;
      
      setProductQRCodes(prev => ({
        ...prev,
        [qrToDelete.affiliationId]: (prev[qrToDelete.affiliationId] || []).filter(qr => qr.id !== qrToDelete.id)
      }));
      setDeleteConfirmOpen(false);
      setQrToDelete(null);
      setMessage({ type: 'success', text: 'QR Code excluído com sucesso.' });
    } catch (err) {
      console.error('Erro ao deletar QR Code:', err);
      setMessage({ type: 'error', text: 'Erro ao deletar QR Code.' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeaffiliate = (product: Product) => {
    setProductToDeaffiliate(product);
    setDeaffiliateConfirmOpen(true);
  };

  const confirmDeaffiliate = async () => {
    if (!productToDeaffiliate || !partnerId) return;
    try {
      const { error } = await supabase
        .from('partner_products')
        .delete()
        .eq('partner_id', partnerId)
        .eq('product_id', productToDeaffiliate.id);
      
      if (error) throw error;
      
      await fetchData();
      setDeaffiliateConfirmOpen(false);
      setProductToDeaffiliate(null);
      setMessage({ type: 'success', text: 'Produto removido dos seus produtos com sucesso.' });
    } catch (err: any) {
      console.error('Erro ao dessacociar produto:', err);
      setMessage({ type: 'error', text: 'Erro ao remover produto: ' + (err.message || '') });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12">
      <div className="mb-2">
        <p className="text-slate-500 mt-1">Compartilhe seus links para indicar novos parceiros ou clientes.</p>
      </div>
      
      {message && (
        <div className={cn(
          "mb-6 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="space-y-10">
        {/* Links de Indicação de Parceiros */}
        {!isCaptador && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-lg font-semibold text-slate-900">Indicar Novos Parceiros</h2>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-full border border-indigo-100/50">Recrutamento</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card Vendedor */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 flex flex-col sm:flex-row items-center gap-6 group hover:border-indigo-200 transition-all">
                <div className="p-3 bg-indigo-50/50 rounded-xl shrink-0 group-hover:bg-indigo-50 transition-colors">
                  <QRCodeSVG value={vendedorLink} size={100} level="M" includeMargin={false} />
                </div>
                <div className="flex-1 space-y-3 w-full text-center sm:text-left">
                  <div>
                    <h3 className="font-semibold text-slate-900">Link para Vendedor</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Indique novos vendedores para sua rede.</p>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={vendedorLink}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 outline-none truncate focus:bg-white transition-colors"
                    />
                    <button 
                      onClick={() => handleCopy(vendedorLink, 'vendedor')}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors shrink-0 border border-indigo-100/50"
                    >
                      {copied === 'vendedor' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Captador */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 flex flex-col sm:flex-row items-center gap-6 group hover:border-emerald-200 transition-all">
                <div className="p-3 bg-emerald-50/50 rounded-xl shrink-0 group-hover:bg-emerald-50 transition-colors">
                  <QRCodeSVG value={captadorLink} size={100} level="M" includeMargin={false} />
                </div>
                <div className="flex-1 space-y-3 w-full text-center sm:text-left">
                  <div>
                    <h3 className="font-semibold text-slate-900">Link para Captador</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Indique captadores de leads parceiros.</p>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={captadorLink}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 outline-none truncate focus:bg-white transition-colors"
                    />
                    <button 
                      onClick={() => handleCopy(captadorLink, 'captador')}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors shrink-0 border border-emerald-100/50"
                    >
                      {copied === 'captador' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Seção de Produtos */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Vender Produtos</h2>
              <p className="text-xs text-slate-500 mt-0.5">Gerencie seus links de venda e QR Codes personalizados.</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl self-start">
              <button
                onClick={() => setActiveTab('my_products')}
                className={cn(
                  "px-5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  activeTab === 'my_products' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Meus Produtos
              </button>
              <button
                onClick={() => setActiveTab('explore')}
                className={cn(
                  "px-5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  activeTab === 'explore' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Explorar
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-slate-500">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Carregando produtos...
                </div>
              ) : activeTab === 'my_products' ? (
                Object.keys(myAffiliations).length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm">Você ainda não se afiliou a nenhum produto.</p>
                    <button 
                      onClick={() => setActiveTab('explore')}
                      className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Ver produtos disponíveis →
                    </button>
                  </div>
                ) : (
                  allProducts
                    .filter(p => myAffiliations[p.id])
                    .map((product) => {
                      const affPhone = myAffiliations[product.id]?.redirect_phone || profilePhone;
                      const phoneParam = affPhone ? `&wa=${affPhone}` : '';
                      const referredParam = (isCaptador && profileReferredBy) ? `&v=${profileReferredBy}` : '';
                      const productLink = `${window.location.origin}/capture/${product.id}?ref=${partnerId}${phoneParam}${referredParam}`;
                      const affiliationId = myAffiliations[product.id]?.id;
                      const qrcodes = productQRCodes[affiliationId] || [];

                      return (
                        <div key={product.id} className="group p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 hover:bg-slate-50/30 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                                {product.image_url ? (
                                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-6 h-6 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900">{product.name}</h3>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Comissão:</span>
                                    <span className="text-sm font-black text-emerald-600">
                                      R$ {partnerType === 'captador' ? (product.commission_captador || 0) : product.commission_direct}
                                    </span>
                                  </div>
                                  {partnerType !== 'captador' && (
                                    <div className="flex items-center gap-2">
                                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded uppercase">N1: R$ {product.commission_lvl1}</span>
                                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded uppercase">N2: R$ {product.commission_lvl2}</span>
                                    </div>
                                  )}
                                  <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                  <span className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-2 py-0.5 rounded-full">{qrcodes.length} QR Codes</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleCopy(productLink, product.id)}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100"
                              >
                                {copied === product.id ? <CheckCircle2 className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                                Copiar Link Principal
                              </button>
                              <button 
                                onClick={() => openQRModal(product)}
                                className="inline-flex items-center justify-center p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                title="Gerenciar QR Codes"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeaffiliate(product)}
                                className="inline-flex items-center justify-center p-2 bg-white border border-slate-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-100 transition-all shadow-sm"
                                title="Dessacociar Produto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Lista Horizontal de QR Codes Extras (Exceto o Padrão) */}
                          {qrcodes.filter(qr => qr.name !== 'Link Padrão').length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                              {qrcodes
                                .filter(qr => qr.name !== 'Link Padrão')
                                .map((qr) => {
                                  const baseUrl = `${window.location.origin}/capture/${product.id}?ref=${partnerId}`;
                                  let finalUrl = qr.redirect_phone ? `${baseUrl}&wa=${qr.redirect_phone}` : baseUrl;
                                  if (isCaptador && profileReferredBy) {
                                    finalUrl += `&v=${profileReferredBy}`;
                                  }
                                  return (
                                    <button
                                      key={qr.id}
                                      onClick={() => handleCopy(finalUrl, qr.id)}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-lg hover:border-indigo-200 hover:bg-white transition-all text-[11px] text-slate-600 group"
                                    >
                                      <span className="max-w-[120px] truncate font-medium">{qr.name}</span>
                                      {copied === qr.id ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" />
                                      )}
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })
                )
              ) : (
                allProducts
                  .filter(p => !myAffiliations[p.id])
                  .map((product) => (
                    <div key={product.id} className="p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{product.name}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Comissão Direta:</span>
                              <span className="text-sm font-black text-emerald-600">
                                R$ {partnerType === 'captador' ? (product.commission_captador || 0) : product.commission_direct}
                              </span>
                            </div>
                            {partnerType !== 'captador' && (
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded uppercase">N1: R$ {product.commission_lvl1}</span>
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded uppercase">N2: R$ {product.commission_lvl2}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleAffiliate(product.id)}
                        disabled={isAffiliating === product.id}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-all"
                      >
                        {isAffiliating === product.id ? (
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          'Vender este produto'
                        )}
                      </button>
                    </div>
                  ))
              )}
              
              {activeTab === 'explore' && allProducts.length > 0 && allProducts.every(p => myAffiliations[p.id]) && (
                <div className="text-center py-12 text-emerald-600 bg-emerald-50/30 rounded-2xl border border-dashed border-emerald-200">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-3 opacity-60" />
                  <p className="text-sm font-semibold text-emerald-700">Você já se afiliou a todos os produtos disponíveis!</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* QR Code Modal */}
      {isQRModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-500">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            {/* Modal Header */}
            <div className="relative p-8 border-b border-slate-100 bg-gradient-to-br from-slate-50/80 via-white to-white">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 shrink-0 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                  <QrCode className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">QR Codes do Produto</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Gerencie links e redirecionamentos exclusivos.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsQRModalOpen(false)}
                className="absolute top-8 right-8 p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100/50 rounded-full transition-all border border-transparent hover:border-slate-100 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 max-h-[75vh] overflow-y-auto space-y-12 custom-scrollbar">
              {/* Product Header Info */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Produto Selecionado</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-3xl tracking-tight">{selectedProduct.name}</h3>
                <p className="text-slate-400 text-sm max-w-[320px] mx-auto leading-relaxed">
                  Crie diferentes QR Codes para rastrear suas origens de tráfego com precisão.
                </p>
              </div>

              {/* Lista de QRCodes Ativos */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Meus QR Codes Ativos</h4>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg uppercase tracking-tighter">
                    {(productQRCodes[myAffiliations[selectedProduct.id]?.id] || []).length} Total
                  </span>
                </div>

                {(productQRCodes[myAffiliations[selectedProduct.id]?.id] || []).length === 0 ? (
                  <div className="text-center py-16 px-8 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-3xl border border-slate-100 flex items-center justify-center mx-auto mb-5 text-slate-300 shadow-sm">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">Nenhum QR Code personalizado criado ainda.</p>
                    <p className="text-xs text-slate-400 mt-1">Utilize o formulário abaixo para começar.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {selectedProduct && myAffiliations[selectedProduct.id] && productQRCodes[myAffiliations[selectedProduct.id].id]?.map((qr) => {
                      const baseUrl = `${window.location.origin}/capture/${selectedProduct.id}?ref=${partnerId}`;
                      let finalUrl = qr.redirect_phone ? `${baseUrl}&wa=${qr.redirect_phone}` : baseUrl;
                      if (isCaptador && profileReferredBy) {
                        finalUrl += `&v=${profileReferredBy}`;
                      }
                      return (
                        <div key={qr.id} className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 relative overflow-hidden">
                          <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-1.5 h-6 bg-indigo-600 rounded-full shrink-0" />
                                <span className="font-bold text-slate-900 text-base truncate">{qr.name}</span>
                              </div>
                              <button 
                                onClick={() => handleDeleteQRCode(qr.id, myAffiliations[selectedProduct.id]?.id || "")}
                                className="px-3.5 py-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
                              >
                                Excluir
                              </button>
                            </div>

                            <div className="relative group/qr flex justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 group-hover:bg-white group-hover:border-indigo-100 transition-all duration-300">
                              <QRCodeSVG id={`qr-${qr.id}`} value={finalUrl} size={160} level="M" includeMargin={false} />
                              <div className="absolute inset-0 bg-white/0 group-hover/qr:bg-white/5 transition-all duration-300 pointer-events-none rounded-2xl" />
                            </div>

                            <div className="flex gap-3">
                              <button 
                                onClick={() => handleCopy(finalUrl, qr.id)}
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-[1.25rem] text-sm font-bold tracking-tight transition-all active:scale-[0.98]",
                                  copied === qr.id 
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                                    : "bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/20"
                                )}
                              >
                                {copied === qr.id ? <CheckCircle2 className="w-5 h-5 animate-in zoom-in" /> : <Copy className="w-5 h-5" />}
                                {copied === qr.id ? "Copiado!" : "Copiar Link"}
                              </button>
                              
                              <button 
                                onClick={() => handleDownloadQR(qr.name, `qr-${qr.id}`)}
                                className="flex items-center justify-center p-4 bg-white border border-slate-200 text-slate-500 rounded-[1.25rem] hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                title="Baixar QR Code"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Info Footer */}
                          {qr.redirect_phone && (
                            <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-50 flex items-center gap-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                              WhatsApp de Redirecionamento: <span className="text-slate-600 font-extrabold">{qr.redirect_phone}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Novo Cadastro de QR Code */}
              <div className="relative p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden group/form">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl group-hover/form:scale-125 transition-transform duration-700" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                
                <div className="relative space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm border border-white/20 shadow-inner">
                      <Plus className="w-6 h-6 border-2 border-white/20 rounded-full p-0.5" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg tracking-tight">Novo Identificador</h4>
                      <p className="text-indigo-400 text-[10px] uppercase tracking-[0.2em] font-extrabold">Gerar novo QR Code</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Nome do Link</label>
                        <span className="text-[9px] text-white/20 font-medium">Recomendado</span>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Ex: Bio do Instagram, Grupo VIP"
                        value={qrName}
                        onChange={(e) => setQrName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all placeholder:text-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">WhatsApp de Destino</label>
                        <span className="text-[9px] text-white/20 font-medium">Opcional</span>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Ex: 5511999999999"
                        value={redirectPhone}
                        onChange={(e) => setRedirectPhone(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all placeholder:text-white/20"
                      />
                    </div>
                    <button
                      onClick={handleAddQRCode}
                      disabled={!qrName}
                      className="w-full py-5 bg-white text-slate-900 text-sm font-extrabold rounded-2xl hover:bg-slate-100 transition-all shadow-xl shadow-white/5 disabled:opacity-20 active:scale-[0.98] mt-2 group/btn"
                    >
                      <span className="flex items-center justify-center gap-3">
                        Gerar QR Code Agora
                        <QrCode className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDeleteQRCode}
        title="Excluir QR Code"
        description="Tem certeza que deseja excluir este QR Code? Esta ação não pode ser desfeita."
      />

      <ConfirmDialog
        open={deaffiliateConfirmOpen}
        onOpenChange={setDeaffiliateConfirmOpen}
        onConfirm={confirmDeaffiliate}
        title="Encerrar Afiliação"
        description={`Tem certeza que deseja dessacociar o produto "${productToDeaffiliate?.name}"? Seus QR Codes personalizados para este produto também serão excluídos.`}
      />
    </div>
  );
}
