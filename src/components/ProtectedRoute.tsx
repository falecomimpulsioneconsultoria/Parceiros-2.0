import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type ProtectedRouteProps = {
  allowedRoles: ('admin' | 'partner' | 'client')[];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, status, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#075e54] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (status === 'Inativo') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Suspenso</h2>
          <p className="text-slate-500 mb-6">Sua conta encontra-se atualmente inativa ou suspensa. Entre em contato com o administrador para mais detalhes.</p>
          <button
            onClick={() => signOut()}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-xl transition-colors"
          >
            Sair e voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (role && !allowedRoles.includes(role)) {
    // Redirect based on role if they try to access a route they shouldn't
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'partner') return <Navigate to="/" replace />;
    if (role === 'client') return <Navigate to="/client" replace />;
  }

  return <Outlet />;
}
