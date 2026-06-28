import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FAFAF8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '32px', height: '32px',
            borderRadius: '8px', background: '#0A0A0A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', color: 'white',
          }}>✦</div>
          <div style={{
            width: '20px', height: '20px',
            border: '2px solid #E8E8E4',
            borderTop: '2px solid #0A0A0A',
            borderRadius: '50%',
            animation: 'pf-spin 0.7s linear infinite',
          }} />
        </div>
        <style>{`@keyframes pf-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
