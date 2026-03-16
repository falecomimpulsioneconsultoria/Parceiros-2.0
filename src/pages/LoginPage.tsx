import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [bgImage, setBgImage] = useState<string | null>(null);

  const { role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch Background Image
    const fetchImage = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('login_image_url')
          .eq('id', 1)
          .single();
        if (data && data.login_image_url) {
          setBgImage(data.login_image_url);
        }
      } catch (err) {
        console.error("Error loading bg image", err);
      }
    };
    fetchImage();
  }, []);

  // If already logged in, redirect to correct dashboard
  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  } else if (role === 'partner') {
    return <Navigate to="/" replace />;
  } else if (role === 'client') {
    return <Navigate to="/client" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Show success message or auto-login
        alert('Cadastro realizado com sucesso! Verifique seu e-mail ou faça login.');
        setIsLogin(true);
      }
    } catch (err: any) {
      console.error('Erro de autenticação:', err);
      setError(err.message || 'Ocorreu um erro ao tentar autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Left side: Image or Pattern */}
      <div className="hidden lg:flex relative bg-[#075e54] overflow-hidden items-center justify-center">
        {bgImage ? (
          <img 
            src={bgImage} 
            alt="Sistema" 
            className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-1000"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="pattern_5" patternUnits="userSpaceOnUse" width="40" height="40">
                  <path d="M0 40 L40 0" stroke="white" strokeWidth="2" fill="none" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#pattern_5)" />
            </svg>
          </div>
        )}
        {/* Soft dark overlay to make sure text is readable if we add any */}
        {bgImage && <div className="absolute inset-0 bg-black/20" />}
      </div>

      {/* Right side: Login Form */}
      <div className="flex items-center justify-center p-8 bg-slate-50 relative">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 z-10 animate-in slide-in-from-right-8 duration-700">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-[#075e54] to-[#128c7e] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#075e54]/20">
              <LogIn className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              {isLogin ? 'Acesse o sistema e gerencie seus resultados' : 'Comece a usar agora mesmo'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50/80 border border-red-100 text-red-700 rounded-xl flex items-start gap-3 text-sm animate-in zoom-in-95 duration-200">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#075e54] focus:border-transparent outline-none transition-all focus:bg-white"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#075e54] focus:border-transparent outline-none transition-all focus:bg-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#075e54] to-[#128c7e] text-white py-3 rounded-xl font-semibold hover:from-[#064c44] hover:to-[#0f776a] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isLogin ? (
                <>Entrar <LogIn className="w-5 h-5 ml-1 opacity-80" /></>
              ) : (
                <>Cadastrar <UserPlus className="w-5 h-5 ml-1 opacity-80" /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 hover:text-[#075e54] transition-colors"
            >
              {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
              <span className="font-semibold text-[#075e54]">
                {isLogin ? 'Cadastre-se' : 'Faça login'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
