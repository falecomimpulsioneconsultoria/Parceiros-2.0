import React, { useState } from 'react';
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
  
  const { role } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#075e54] rounded-xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isLogin ? 'Acesse sua conta' : 'Crie sua conta'}
          </h1>
          <p className="text-slate-500 mt-2">
            {isLogin ? 'Bem-vindo de volta ao sistema' : 'Comece a usar o sistema agora mesmo'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#075e54] focus:border-transparent outline-none"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#075e54] focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#075e54] text-white py-2.5 rounded-xl font-medium hover:bg-[#064c44] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isLogin ? (
              <>Entrar <LogIn className="w-4 h-4" /></>
            ) : (
              <>Cadastrar <UserPlus className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-[#075e54] hover:underline font-medium"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
}
