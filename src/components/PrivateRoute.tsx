import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'operador' | 'negociador';
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole }) => {
  const { user, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocl-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin access everything
  if (isAdmin) {
    return <>{children}</>;
  }

  // Role check
  if (requiredRole && profile?.role !== requiredRole) {
    // If negociador tries to access admin-only, redirect to its allowed page
    return <Navigate to="/negociador" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
