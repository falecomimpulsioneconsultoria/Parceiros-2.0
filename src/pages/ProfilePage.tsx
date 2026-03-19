import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Shield, Save, CheckCircle2, AlertCircle, Calendar, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import type { Database } from '../lib/database.types';

const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: string | null;
  balance: number;
  referred_by: string | null;
  partner_type: string | null;
  level: string | null;
  cpf?: string | null;
  rg?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  address_zip_code?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  updated_at?: string | null;
  person_type: 'PF' | 'PJ' | null;
  referred_profile?: { full_name: string } | null;
};

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    cpf: '',
    rg: '',
    birth_date: '',
    gender: '',
    address_zip_code: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    person_type: 'PF' as 'PF' | 'PJ',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, referred_profile:referred_by(full_name)')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        console.log('Dados do perfil carregados:', data);
        setProfile(data as any as Profile);
        const p = data as any;
        setFormData({
          full_name: p.full_name || '',
          phone: p.phone || '',
          cpf: p.cpf || '',
          rg: p.rg || '',
          birth_date: p.birth_date || '',
          gender: p.gender || '',
          address_zip_code: p.address_zip_code || '',
          address_street: p.address_street || '',
          address_number: p.address_number || '',
          address_complement: p.address_complement || '',
          address_neighborhood: p.address_neighborhood || '',
          address_city: p.address_city || '',
          address_state: p.address_state || '',
          person_type: (p.person_type as 'PF' | 'PJ') || 'PF',
        });
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar dados do perfil.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Limpa os dados: remove campos vazios (converte em null) para evitar erro de tipo no Postgres (ex: data)
      const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
        acc[key as keyof typeof formData] = value === '' ? null : value;
        return acc;
      }, {} as any);

      const { error } = await supabase
        .from('profiles')
        .update({
          ...cleanedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      setMessage({ type: 'error', text: `Erro ao salvar: ${error.message || 'Erro desconhecido'}` });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
          <p className="text-slate-500 mt-1">Gerencie suas informações pessoais e de contato.</p>
        </div>
        
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-4",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Dados Básicos */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="flex items-center gap-4 relative">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Dados Pessoais</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Informações de identificação</p>
              </div>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Nome Completo</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full pl-5 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">E-mail</label>
              <div className="relative">
                <input
                  type="email"
                  readOnly
                  value={profile?.email || ''}
                  className="w-full pl-5 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl opacity-60 cursor-not-allowed text-sm font-medium"
                />
                <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">WhatsApp</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Indicado por</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={profile?.referred_profile?.full_name || 'Direto / Admin'}
                  className="w-full pl-5 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl opacity-60 cursor-not-allowed text-sm font-bold text-slate-900"
                />
                <UserCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Documentação */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Documentação</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Segurança e Verificação</p>
              </div>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Tipo de Pessoa</label>
              <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200 h-[50px]">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, person_type: 'PF', cpf: '' })}
                  className={cn(
                    "flex-1 rounded-xl text-xs font-bold transition-all",
                    formData.person_type === 'PF' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  PF
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, person_type: 'PJ', cpf: '' })}
                  className={cn(
                    "flex-1 rounded-xl text-xs font-bold transition-all",
                    formData.person_type === 'PJ' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  PJ
                </button>
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">
                {formData.person_type === 'PF' ? 'CPF' : 'CNPJ'}
              </label>
              <input
                type="text"
                placeholder={formData.person_type === 'PF' ? "000.000.000-00" : "00.000.000/0000-00"}
                value={formData.cpf}
                onChange={e => {
                  const val = e.target.value;
                  const masked = formData.person_type === 'PF' ? maskCPF(val) : maskCNPJ(val);
                  setFormData({ ...formData, cpf: masked });
                }}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">RG</label>
              <input
                type="text"
                value={formData.rg}
                onChange={e => setFormData({ ...formData, rg: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Data Nascimento</label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Gênero</label>
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-100">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Endereço Residencial</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Localização e Correspondência</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">CEP</label>
                <input
                  type="text"
                  value={formData.address_zip_code}
                  onChange={e => setFormData({ ...formData, address_zip_code: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Rua / Logradouro</label>
                <input
                  type="text"
                  value={formData.address_street}
                  onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Número</label>
                <input
                  type="text"
                  value={formData.address_number}
                  onChange={e => setFormData({ ...formData, address_number: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Complemento</label>
                <input
                  type="text"
                  value={formData.address_complement}
                  onChange={e => setFormData({ ...formData, address_complement: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Bairro</label>
                <input
                  type="text"
                  value={formData.address_neighborhood}
                  onChange={e => setFormData({ ...formData, address_neighborhood: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Cidade</label>
                <input
                  type="text"
                  value={formData.address_city}
                  onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Estado</label>
                <input
                  type="text"
                  value={formData.address_state}
                  onChange={e => setFormData({ ...formData, address_state: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white text-sm font-extrabold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
