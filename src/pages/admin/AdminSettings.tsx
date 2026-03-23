import React, { useState, useEffect, useRef } from 'react';
import { Save, Percent, Award, Wallet, Settings as SettingsIcon, ShieldCheck, Image as ImageIcon, Upload, X, LayoutDashboard, Plus, Trash2, GripVertical, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export function AdminSettings() {
  const [activeTab, setActiveTab] = useState('commissions');

  const tabs = [
    { id: 'commissions', label: 'Gamificação e Níveis', icon: Award },
    { id: 'financial', label: 'Financeiro e Saques', icon: Wallet },
    { id: 'kanban', label: 'Funil e Kanban', icon: LayoutDashboard },
    { id: 'security', label: 'Segurança', icon: ShieldCheck },
    { id: 'general', label: 'Geral', icon: SettingsIcon },
  ];

  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [loginImageUrl, setLoginImageUrl] = useState<string>('');
  const [stages, setStages] = useState<{id: string, name: string, color: string}[]>([
    {id: "lead", name: "Lead", color: "#3b82f6"},
    {id: "negociacao", name: "Em Negociação", color: "#f59e0b"},
    {id: "fechado", name: "Fechado", color: "#10b981"},
    {id: "perdido", name: "Perdido", color: "#ef4444"}
  ]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [financialSettings, setFinancialSettings] = useState({
    min_withdrawal: 100,
    withdrawal_fee: 0,
    release_days: 30,
    infinitepay_tag: '',
    infinitepay_api_key: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (data) {
        if (data.login_image_url) setLoginImageUrl(data.login_image_url);
        if (data.lead_stages && Array.isArray(data.lead_stages)) {
          setStages(data.lead_stages as any);
        }
        setFinancialSettings({
          min_withdrawal: Number(data.min_withdrawal) || 100,
          withdrawal_fee: Number(data.withdrawal_fee) || 0,
          release_days: Number(data.release_days) || 30,
          infinitepay_tag: data.infinitepay_tag || '',
          infinitepay_api_key: data.infinitepay_api_key || ''
        });
      }
    } catch (error) {
      console.error('Erro ao buscar configuracoes:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveKanbanStages = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ lead_stages: stages })
        .eq('id', 1);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Etapas do funil salvas com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao salvar etapas:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar etapas: ' + error.message });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveFinancial = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          min_withdrawal: financialSettings.min_withdrawal,
          withdrawal_fee: financialSettings.withdrawal_fee,
          release_days: financialSettings.release_days,
          infinitepay_tag: financialSettings.infinitepay_tag,
          infinitepay_api_key: financialSettings.infinitepay_api_key
        })
        .eq('id', 1);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Configurações financeiras salvas com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao salvar config financeiras:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar: ' + error.message });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const addStage = () => {
    const newId = `stage_${Date.now()}`;
    setStages([...stages, { id: newId, name: 'Nova Etapa', color: '#94a3b8' }]);
  };

  const removeStage = (id: string) => {
    if (stages.length <= 1) {
      setMessage({ type: 'error', text: 'Você precisa ter pelo menos 1 etapa no funil.' });
      return;
    }
    setStages(stages.filter(s => s.id !== id));
  };

  const updateStage = (id: string, field: 'name' | 'color', value: string) => {
    setStages(stages.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newStages = [...stages];
      const temp = newStages[index - 1];
      newStages[index - 1] = newStages[index];
      newStages[index] = temp;
      setStages(newStages);
    } else if (direction === 'down' && index < stages.length - 1) {
      const newStages = [...stages];
      const temp = newStages[index + 1];
      newStages[index + 1] = newStages[index];
      newStages[index] = temp;
      setStages(newStages);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      setUploadingImage(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `login-bg-${Date.now()}.${fileExt}`;
      const filePath = `login/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      setLoginImageUrl(publicUrl);

      // 3. Save to database immediately
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({ login_image_url: publicUrl })
        .eq('id', 1);

      if (updateError) throw updateError;
      
      setMessage({ type: 'success', text: 'Imagem atualizada com sucesso!' });
    } catch (error: any) {
      console.error('Erro no upload da imagem:', error);
      setMessage({ type: 'error', text: 'Erro ao fazer upload da imagem: ' + error.message });
    } finally {
      setUploadingImage(false);
      setTimeout(() => setMessage(null), 3000);
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    try {
      setUploadingImage(true);
      const { error } = await supabase
        .from('system_settings')
        .update({ login_image_url: null })
        .eq('id', 1);

      if (error) throw error;
      setLoginImageUrl('');
      setMessage({ type: 'success', text: 'Imagem removida com sucesso!' });
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      setMessage({ type: 'error', text: 'Erro ao remover imagem.' });
    } finally {
      setUploadingImage(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
          <p className="text-slate-500 mt-1">Defina as regras de negócio, comissionamento e parâmetros globais.</p>
        </div>
        
        {message && (
          <div className={cn(
            "fixed top-6 right-6 z-[100] p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-right-4 duration-300 shadow-xl",
            message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
          )}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}
        <button 
          onClick={() => {
            if (activeTab === 'kanban') handleSaveKanbanStages();
            if (activeTab === 'financial') handleSaveFinancial();
            if (activeTab === 'commissions') {
              setMessage({ type: 'success', text: 'Configurações de níveis salvas (simulação)' });
              setTimeout(() => setMessage(null), 3000);
            }
          }}
          disabled={loading}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          Salvar Alterações
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-indigo-600" : "text-slate-400")} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {activeTab === 'commissions' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Partner Levels */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      Níveis de Parceiros (Gamificação)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Regras para evolução de nível na plataforma.</p>
                  </div>
                  <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Adicionar Nível</button>
                </div>
                <div className="p-6 space-y-6">
                  {/* Level 1 */}
                  <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Nível 1: Afiliado</h3>
                      <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2 py-1 rounded">Padrão</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Requisito: Vendas Mínimas</label>
                        <input type="number" defaultValue={0} disabled className="w-full border border-slate-200 rounded-md px-3 py-2 bg-slate-100 text-slate-500 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Bônus de Comissão (%)</label>
                        <input type="number" defaultValue={0} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white" />
                      </div>
                    </div>
                  </div>

                  {/* Level 2 */}
                  <div className="p-4 border border-indigo-100 rounded-lg bg-indigo-50/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-indigo-900">Nível 2: Premium</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Requisito: Vendas Mínimas (R$)</label>
                        <input type="number" defaultValue={10000} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Bônus de Comissão (%)</label>
                        <input type="number" defaultValue={5} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                    Regras de Saque
                  </h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Valor Mínimo para Saque (R$)</label>
                      <input 
                        type="number" 
                        value={financialSettings.min_withdrawal}
                        onChange={e => setFinancialSettings({...financialSettings, min_withdrawal: Number(e.target.value)})}
                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Taxa de Saque (R$)</label>
                      <input 
                        type="number" 
                        value={financialSettings.withdrawal_fee}
                        onChange={e => setFinancialSettings({...financialSettings, withdrawal_fee: Number(e.target.value)})}
                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                      />
                      <p className="text-xs text-slate-500">Custo fixo descontado do parceiro por saque.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Prazo de Liberação (Dias)</label>
                      <input 
                        type="number" 
                        value={financialSettings.release_days}
                        onChange={e => setFinancialSettings({...financialSettings, release_days: Number(e.target.value)})}
                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                      />
                      <p className="text-xs text-slate-500">Dias após a venda para o saldo ficar disponível (Garantia).</p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-500" />
                      Integração InfinitePay
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Infinite Tag (Ex: mercadofree)</label>
                        <input 
                          type="text" 
                          value={financialSettings.infinitepay_tag}
                          onChange={e => setFinancialSettings({...financialSettings, infinitepay_tag: e.target.value})}
                          placeholder="Sua tag da InfinitePay"
                          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                        />
                        <p className="text-xs text-slate-500">Sua InfiniteTag (sem o $) usada para gerar os links de checkout.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                      Etapas do Funil (Kanban)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Personalize as colunas que aparecerão na tela de Clientes para todos os parceiros.</p>
                  </div>
                  <button 
                    onClick={addStage}
                    className="inline-flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Etapa
                  </button>
                </div>
                
                <div className="p-6">
                  {settingsLoading ? (
                    <div className="py-12 flex justify-center">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stages.map((stage, index) => (
                        <div key={stage.id} className="flex items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded-lg group transition-all hover:bg-white hover:shadow-md hover:border-indigo-200">
                          <div className="flex flex-col gap-1 items-center shrink-0">
                            <button 
                              onClick={() => moveStage(index, 'up')}
                              disabled={index === 0}
                              className="text-slate-300 hover:text-indigo-600 disabled:opacity-30 p-1"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                            </button>
                            <GripVertical className="w-4 h-4 text-slate-400" />
                            <button 
                              onClick={() => moveStage(index, 'down')}
                              disabled={index === stages.length - 1}
                              className="text-slate-300 hover:text-indigo-600 disabled:opacity-30 p-1"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                          </div>
                          
                          <div className="shrink-0 relative">
                            <input 
                              type="color" 
                              value={stage.color}
                              onChange={(e) => updateStage(stage.id, 'color', e.target.value)}
                              className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                            />
                          </div>

                          <div className="flex-1">
                            <input
                              type="text"
                              value={stage.name}
                              onChange={(e) => updateStage(stage.id, 'name', e.target.value)}
                              className="w-full bg-transparent font-medium text-slate-800 border-b border-transparent focus:border-indigo-300 focus:outline-none focus:ring-0 px-2 py-1.5 transition-colors"
                              placeholder="Nome da etapa"
                            />
                            <div className="text-xs text-slate-400 px-2 mt-1 font-mono">ID: {stage.id}</div>
                          </div>

                          <button 
                            onClick={() => removeStage(stage.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-50 group-hover:opacity-100"
                            title="Remover etapa"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}

                      <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={handleSaveKanbanStages}
                          disabled={loading}
                          className="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                          ) : (
                            <Save className="w-5 h-5 mr-2" />
                          )}
                          Salvar Etapas no Banco
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 text-center">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Configurações de Segurança</h3>
                <p className="text-slate-500 mt-2">Em breve: Autenticação em duas etapas (2FA), logs de acesso e restrições de IP.</p>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Informações da Plataforma</h2>
                </div>
                <div className="p-6 space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-slate-800">Detalhes da Empresa</h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Nome da Empresa / Plataforma</label>
                      <input type="text" defaultValue="Impulsione Consultoria" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">E-mail de Suporte</label>
                      <input type="email" defaultValue="suporte@impulsione.com" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-slate-800">Aparência da Plataforma</h3>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-700">Imagem Lateral da Tela de Login</label>
                      <p className="text-xs text-slate-500 mb-4">Recomendado: 1080x1920px (Proporção 9:16). Será exibida na metade direita da tela de login.</p>
                      
                      {settingsLoading ? (
                        <div className="w-full h-48 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-slate-400">
                          Carregando...
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                          <div className="w-full sm:w-64 h-auto aspect-[9/16] bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden relative group shrink-0 shadow-sm flex items-center justify-center">
                            {loginImageUrl ? (
                              <>
                                <img src={loginImageUrl} alt="Login Background" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button 
                                    onClick={handleRemoveImage}
                                    disabled={uploadingImage}
                                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                                    title="Remover Imagem"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="text-center p-6">
                                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">Nenhuma imagem definida</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 space-y-3 w-full">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                            />
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingImage}
                              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm disabled:opacity-50"
                            >
                              {uploadingImage ? (
                                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                              ) : (
                                <Upload className="w-5 h-5 mr-2" />
                              )}
                              {uploadingImage ? 'Enviando...' : (loginImageUrl ? 'Trocar Imagem' : 'Fazer Upload de Imagem')}
                            </button>
                            <p className="text-xs text-slate-500 block max-w-sm">
                              A imagem será carregada automaticamente no servidor e atualizada na tela de login de todos os usuários.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
