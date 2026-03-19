import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Send, User, CheckCheck, ArrowLeft, MoreVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  link: string;
};

type Message = {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
};

export function LeadCapturePage() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const partnerId = searchParams.get('ref');
  const vendedorId = searchParams.get('v');
  const waNumber = searchParams.get('wa');

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [step, setStep] = useState(0); // 0: Name, 1: Email, 2: WhatsApp, 3: Done
  const [leadData, setLeadData] = useState({ name: '', email: '', whatsapp: '' });
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    async function fetchProduct() {
      if (!productId) {
        setError('ID do produto não fornecido');
        setLoading(false);
        return;
      }

      try {
        const { data, error: err } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (err) throw err;
        setProduct(data);
      } catch (err) {
        console.error('Erro ao buscar produto:', err);
        setError('Produto não encontrado');
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [productId]);

  // Keep focus on input
  useEffect(() => {
    if (!isTyping && step < 3) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [isTyping, step]);

  // Initial greeting
  useEffect(() => {
    if (loading || !product || initialized.current) return;
    initialized.current = true;
    
    const initChat = async () => {
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setMessages([
        {
          id: '1',
          sender: 'bot',
          text: `Olá! 👋 Vi que você tem interesse no *${product.name}*.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setMessages(prev => [...prev, {
        id: '2',
        sender: 'bot',
        text: 'Para continuarmos e eu te liberar o acesso, como posso te chamar?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
    };

    initChat();
  }, [product]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userText = inputValue.trim();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add user message
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userText, time: currentTime }]);
    setInputValue('');
    setIsTyping(true);

    // Process step
    let nextStep = step + 1;
    let newLeadData = { ...leadData };

    if (step === 0) {
      newLeadData.name = userText;
      setLeadData(newLeadData);
      setStep(nextStep);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        text: `Prazer, ${userText.split(' ')[0]}! Qual é o seu melhor e-mail? 📧`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
    } 
    else if (step === 1) {
      newLeadData.email = userText;
      setLeadData(newLeadData);
      setStep(nextStep);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        text: 'Perfeito! E qual é o seu número de WhatsApp (com DDD)? 📱',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
    }
    else if (step === 2) {
      newLeadData.whatsapp = userText;
      setLeadData(newLeadData);
      setStep(nextStep);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        text: 'Tudo certo! Recebi seus dados. ✅',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      // Save to Supabase
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          // 1. Identifica se é captação via captador (usando parâmetro 'v' ou consulta ao banco)
          let finalPartnerId = partnerId;
          let finalCaptadorId = null;

          if (vendedorId) {
            // Se o parâmetro 'v' (vendedor) está presente, sabemos que 'ref' é o captador
            finalPartnerId = vendedorId;
            finalCaptadorId = partnerId;
          } else {
            // Fallback: Busca perfil do parceiro para identificar se é captador (caso o link seja antigo/sem 'v')
            const { data: partnerProfile } = await supabase
              .from('profiles')
              .select('referred_by, role')
              .eq('id', partnerId)
              .single();

            const isCaptador = partnerProfile?.role === 'partner' && partnerProfile?.referred_by;
            if (isCaptador) {
              finalPartnerId = partnerProfile.referred_by || partnerId;
              finalCaptadorId = partnerId;
            }
          }

          const leadDataInsert: Database['public']['Tables']['leads']['Insert'] = {
            name: newLeadData.name,
            email: newLeadData.email,
            phone: newLeadData.whatsapp,
            product_id: product.id,
            partner_id: finalPartnerId || null,
            captador_id: finalCaptadorId,
            status: 'Lead',
            created_at: new Date().toISOString()
          };
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert([leadDataInsert])
            .select()
            .single();
          
          if (leadError) throw leadError;

          // 2. Cria o negócio (lead_deal) vinculado ao lead e ao produto capturado
          if (newLead && finalPartnerId) {
            await supabase.from('lead_deals').insert([{
              lead_id: newLead.id,
              partner_id: finalPartnerId,
              captador_id: finalCaptadorId,
              product_id: product.id,
              status: 'Lead',
              value: product.price || 0,
            }]);
          }
        }
      } catch (error) {
        console.error('Error saving lead to Supabase:', error);
      }

      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        text: waNumber ? 'Estou te transferindo para o nosso WhatsApp para finalizarmos...' : 'Estou te redirecionando para a página do produto...',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);

      // Execute redirect
      setTimeout(() => {
        if (waNumber) {
          const text = `Olá! Acabei de me cadastrar. Tenho interesse no produto: ${product?.name}. Meu nome é ${newLeadData.name}.`;
          window.location.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
        } else {
          window.location.href = `${product?.link}?ref=${partnerId}`;
        }
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#075e54] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Carregando atendimento...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Produto não encontrado</h2>
          <p className="text-slate-500">O link que você acessou é inválido ou o produto foi removido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#efeae2] flex flex-col md:items-center md:justify-center font-sans">
      {/* Mobile container that looks like a phone on desktop */}
      <div className="w-full h-screen md:h-[85vh] md:max-w-md md:rounded-3xl md:shadow-2xl md:overflow-hidden flex flex-col bg-[#efeae2] relative border-x border-y md:border-slate-300">
        
        {/* Chat Header */}
        <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3 z-10 shadow-md">
          <button className="md:hidden -ml-2 p-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-base leading-tight">Atendimento</h2>
            <p className="text-xs text-white/80">Online</p>
          </div>
          <button className="p-2">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none" 
             style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg")', backgroundSize: 'cover' }}>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10">
          <div className="flex justify-center mb-4">
            <span className="bg-[#e1f3fb] text-[#54656f] text-xs px-3 py-1 rounded-lg shadow-sm">
              Hoje
            </span>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm relative ${
                msg.sender === 'user' 
                  ? 'bg-[#dcf8c6] rounded-tr-none' 
                  : 'bg-white rounded-tl-none'
              }`}>
                {/* Tail */}
                <div className={`absolute top-0 w-3 h-3 ${
                  msg.sender === 'user'
                    ? '-right-2.5 bg-[#dcf8c6]'
                    : '-left-2.5 bg-white'
                }`} style={{ clipPath: msg.sender === 'user' ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }}></div>
                
                <p className="text-[#111b21] text-[15px] leading-snug whitespace-pre-wrap">
                  {msg.text}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[11px] text-[#667781]">{msg.time}</span>
                  {msg.sender === 'user' && (
                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm relative">
                <div className="absolute top-0 -left-2.5 w-3 h-3 bg-white" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}></div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-[#f0f2f5] p-3 z-10">
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <div className="flex-1 bg-white rounded-2xl px-4 py-2 shadow-sm flex items-center min-h-[44px]">
              <input
                ref={inputRef}
                type={step === 1 ? "email" : step === 2 ? "tel" : "text"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={step === 3 ? "Aguarde..." : "Mensagem"}
                disabled={step === 3}
                readOnly={isTyping}
                autoFocus
                className="w-full bg-transparent focus:outline-none text-[15px] text-[#111b21] placeholder:text-[#8696a0]"
              />
            </div>
            <button 
              type="submit"
              disabled={!inputValue.trim() || step === 3 || isTyping}
              className="w-11 h-11 bg-[#00a884] rounded-full flex items-center justify-center text-white shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
