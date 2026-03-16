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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const partnerId = user?.id || '';
  const partnerLink = `https://partnercrm.app/ref/${partnerId}`;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'Ativo')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const openQRModal = (product: Product) => {
    setSelectedProduct(product);
    setIsQRModalOpen(true);
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

        {/* Vender Produtos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Vender Produtos</h2>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-slate-500">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Carregando produtos...
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Nenhum produto disponível.</div>
            ) : (
              products.map((product) => {
                const productLink = `https://partnercrm.app/checkout/${product.id}?ref=${partnerId}`;
                return (
                  <div key={product.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-slate-900">{product.name}</h3>
                        <div className="text-sm text-slate-500 mt-1">
                          Comissão: <span className="font-medium text-emerald-600">{product.commission_rate}%</span>
                        </div>
                      </div>
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Package className="w-5 h-5" />
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
                  value={`https://partnercrm.app/checkout/${selectedProduct.id}?ref=${partnerId}`} 
                  size={200} 
                  level="H" 
                  includeMargin 
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Adicionar redirecionamento para WhatsApp (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 5511999999999"
                    value={redirectPhone}
                    onChange={(e) => setRedirectPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm"
                  />
                  <p className="text-xs text-slate-500">Se preenchido, o cliente será redirecionado para seu WhatsApp após a compra.</p>
                </div>

                <button 
                  onClick={() => {
                    const baseUrl = `https://partnercrm.app/checkout/${selectedProduct.id}?ref=${partnerId}`;
                    const finalUrl = redirectPhone ? `${baseUrl}&wpp=${redirectPhone}` : baseUrl;
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
