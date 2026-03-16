import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, Package, QrCode, X, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

export function LinksPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [redirectPhone, setRedirectPhone] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [myAffiliations, setMyAffiliations] = useState<Record<string, { redirect_phone: string | null }>>({});
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my_products' | 'explore'>('my_products');
  const [isAffiliating, setIsAffiliating] = useState<string | null>(null);
  
  const { user } = useAuth();
  const partnerId = user?.id || '';
  const partnerLink = `${window.location.origin}/ref/${partnerId}`;

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
          .select('phone')
          .eq('id', partnerId)
          .single();
        
        if (profile && profile.phone) {
          setProfilePhone(profile.phone);
        }

        const { data: affiliations, error: affErr } = await supabase
          .from('partner_products')
          .select('product_id, redirect_phone')
          .eq('partner_id', partnerId);

        if (affErr) {
          console.error('Erro (ou tabela inexistente) nas afiliações:', affErr.message);
        } else {
          const affMap: Record<string, { redirect_phone: string | null }> = {};
          affiliations?.forEach(a => {
            affMap[a.product_id] = { redirect_phone: a.redirect_phone };
          });
          setMyAffiliations(affMap);
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
      const { error } = await supabase
        .from('partner_products')
        .insert({ partner_id: partnerId, product_id: productId });
      
      if (error) {
        if (error.code === '23505') {
          // Already affiliated (unique constraint)
          setMyAffiliations(prev => ({ ...prev, [productId]: { redirect_phone: null } }));
        } else {
          throw error;
        }
      } else {
        setMyAffiliations(prev => ({ ...prev, [productId]: { redirect_phone: null } }));
        alert('Afiliado com sucesso! O produto agora está em Meus Produtos.');
      }
    } catch (error: any) {
      console.error('Erro ao se afiliar:', error);
      alert('Erro ao se afiliar: ' + (error.message || ''));
    } finally {
      setIsAffiliating(null);
    }
  };
  
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const openQRModal = (product: Product) => {
    setSelectedProduct(product);
    const existingPhone = myAffiliations[product.id]?.redirect_phone;
    setRedirectPhone(existingPhone || profilePhone || '');
    setIsQRModalOpen(true);
  };

  const handleSavePhone = async () => {
    if (!selectedProduct) return;
    try {
      const { error } = await supabase
        .from('partner_products')
        .update({ redirect_phone: redirectPhone || null })
        .eq('partner_id', partnerId)
        .eq('product_id', selectedProduct.id);
      
      if (error) throw error;
      
      setMyAffiliations(prev => ({
        ...prev,
        [selectedProduct.id]: { redirect_phone: redirectPhone || null }
      }));
      alert('Telefone de redirecionamento salvo para este produto!');
    } catch (err) {
      console.error('Erro ao salvar telefone:', err);
      alert('Erro ao salvar o telefone.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Meus Links e QR Codes</h1>
        <p className="text-slate-500 mt-1">Compartilhe seus links para indicar novos parceiros ou clientes.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Indicar Parceiros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Indicar Novos Parceiros</h2>
          <div className="flex justify-center mb-6 p-4 bg-slate-50 rounded-lg">
            <QRCodeSVG value={partnerLink} size={160} level="H" includeMargin />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Seu link de indicação</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={partnerLink}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none"
              />
              <button 
                onClick={() => handleCopy(partnerLink, 'partner')}
                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                title="Copiar Link"
              >
                {copied === 'partner' ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Vitrine de Produtos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Vender Produtos</h2>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('my_products')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'my_products' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Meus Produtos
              </button>
              <button
                onClick={() => setActiveTab('explore')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'explore' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Explorar
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-slate-500">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Carregando produtos...
              </div>
            ) : activeTab === 'my_products' ? (
              // ABA: Meus Produtos
              Object.keys(myAffiliations).length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Package className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p>Você ainda não se afiliou a nenhum produto.</p>
                  <button 
                    onClick={() => setActiveTab('explore')}
                    className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
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
                    const productLink = `${window.location.origin}/capture/${product.id}?ref=${partnerId}${phoneParam}`;
                    return (
                      <div key={product.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-slate-900">{product.name}</h3>
                            <div className="text-sm text-slate-500 mt-1">
                              Comissão: <span className="font-medium text-emerald-600">{product.commission_rate}%</span>
                            </div>
                          </div>
                          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <button 
                            onClick={() => handleCopy(productLink, product.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition-colors border border-slate-200"
                          >
                            {copied === product.id ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <LinkIcon className="w-4 h-4" />}
                            Copiar Link
                          </button>
                          <button 
                            onClick={() => openQRModal(product)}
                            className="flex items-center justify-center p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200"
                            title="Gerar QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                })
              )
            ) : (
              // ABA: Explorar
              allProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Nenhum produto ativo encontrado no sistema.</div>
              ) : (
                allProducts
                  .filter(p => !myAffiliations[p.id])
                  .map((product) => (
                    <div key={product.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-slate-900">{product.name}</h3>
                          <div className="text-sm text-slate-500 mt-1">
                            Comissão oferecida: <span className="font-medium text-emerald-600">{product.commission_rate}%</span>
                          </div>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                          <Package className="w-5 h-5" />
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleAffiliate(product.id)}
                        disabled={isAffiliating === product.id}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg transition-colors"
                      >
                        {isAffiliating === product.id ? (
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          'Vender este produto'
                        )}
                      </button>
                    </div>
                ))
              )
            )}
            
            {activeTab === 'explore' && allProducts.length > 0 && allProducts.every(p => myAffiliations[p.id]) && (
              <div className="text-center py-8 text-emerald-600 bg-emerald-50 rounded-xl border border-dashed border-emerald-200">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <p className="font-medium">Você já se afiliou a todos os produtos disponíveis!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {isQRModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">QR Code do Produto</h2>
              <button 
                onClick={() => setIsQRModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <h3 className="font-medium text-slate-900 text-lg">{selectedProduct.name}</h3>
                <p className="text-slate-500 text-sm mt-1">Escaneie para acessar o checkout com sua indicação.</p>
              </div>

              <div className="flex justify-center mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <QRCodeSVG 
                  value={`${window.location.origin}/capture/${selectedProduct.id}?ref=${partnerId}`} 
                  size={200} 
                  level="H" 
                  includeMargin 
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Adicionar redirecionamento para WhatsApp (Opcional)</label>
                  <div className="flex gap-2 mt-1">
                    <input 
                      type="text" 
                      placeholder="Ex: 5511999999999"
                      value={redirectPhone}
                      onChange={(e) => setRedirectPhone(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm"
                    />
                    <button
                      onClick={handleSavePhone}
                      className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors border border-slate-200"
                    >
                      Salvar Telefone
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {profilePhone && !myAffiliations[selectedProduct.id]?.redirect_phone 
                      ? 'Usando o telefone padrão do seu perfil.' 
                      : 'Se preenchido, o cliente será redirecionado para este WhatsApp após a compra.'}
                  </p>
                </div>

                <button 
                  onClick={() => {
                    const baseUrl = `${window.location.origin}/capture/${selectedProduct.id}?ref=${partnerId}`;
                    const finalUrl = redirectPhone ? `${baseUrl}&wa=${redirectPhone}` : baseUrl;
                    handleCopy(finalUrl, 'modal-qr');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  {copied === 'modal-qr' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Link Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar Link do QR Code
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
