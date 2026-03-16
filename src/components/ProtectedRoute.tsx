import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type ProtectedRouteProps = {
  allowedRoles: ('admin' | 'partner' | 'client')[];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

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

  if (role && !allowedRoles.includes(role)) {
    // Redirect based on role if they try to access a route they shouldn't
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'partner') return <Navigate to="/" replace />;
    if (role === 'client') return <Navigate to="/client" replace />;
  }

  return <Outlet />;
}
