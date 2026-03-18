import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export function RegisterPage() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'vendedor';
  const navigate = useNavigate();
  const { role } = useAuth();

  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Se já está logado, redireciona
  if (role === 'admin')   return <Navigate to="/admin" replace />;
  if (role === 'partner') return <Navigate to="/" replace />;
  if (role === 'client')  return <Navigate to="/client" replace />;

  useEffect(() => {
    // Busca o nome de quem indicou
    const fetchReferrer = async () => {
      if (!partnerId) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', partnerId)
        .single();
      if (data) setReferrerName(data.full_name || data.email);
    };

    // Busca a imagem de fundo da tela de login
    const fetchBgImage = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('login_image_url')
          .eq('id', 1)
          .single();
        if (data?.login_image_url) setBgImage(data.login_image_url);
      } catch (_) {}
    };

    fetchReferrer();
    fetchBgImage();
  }, [partnerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // 1. Cria a conta no Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.fullName }
        }
      });

      if (signUpError) throw signUpError;

      // 2. Atualiza o perfil com full_name, role e referred_by
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: form.fullName,
            role: 'partner',
            referred_by: partnerId || null,
            partner_type: type,
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Erro ao salvar perfil:', profileError);
        }
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      if (err.message?.includes('already registered')) {
        setError('Este e-mail já está cadastrado. Tente fazer login.');
      } else {
        setError(err.message || 'Erro ao realizar cadastro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Cadastro realizado!</h2>
          <p className="text-slate-500 mb-6">
            Sua conta foi criada com sucesso. Verifique seu e-mail para confirmar o cadastro e depois faça login.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Ir para o Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Left side: Image */}
      <div className="hidden lg:flex relative bg-[#075e54] overflow-hidden items-center justify-center">
        {bgImage ? (
          <img src={bgImage} alt="Sistema" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="pattern_reg" patternUnits="userSpaceOnUse" width="40" height="40">
                  <path d="M0 40 L40 0" stroke="white" strokeWidth="2" fill="none" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#pattern_reg)" />
            </svg>
          </div>
        )}
        {bgImage && <div className="absolute inset-0 bg-black/20" />}
        {/* Overlay text */}
        <div className="relative z-10 text-center text-white px-8">
          <h2 className="text-3xl font-bold mb-3">Seja bem-vindo!</h2>
          <p className="text-white/80 text-lg">
            Junte-se à nossa rede de parceiros e comece a gerar renda.
          </p>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl mb-4 lg:mb-3">
              <UserPlus className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">Cadastro de {type}</h1>
            {referrerName ? (
              <p className="text-slate-500 mt-1">
                Você foi convidado por <span className="font-semibold text-indigo-700">{referrerName}</span>
              </p>
            ) : (
              <p className="text-slate-500 mt-1">Crie sua conta para começar como {type}.</p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                placeholder="Seu nome completo"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm pr-12"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar Senha</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Repita a senha"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Já tem uma conta?{' '}
            <a href="/login" className="text-indigo-600 font-medium hover:underline">
              Fazer login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
