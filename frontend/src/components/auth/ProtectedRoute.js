// frontend/src/components/auth/ProtectedRoute.js
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from 'react-bootstrap';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">読み込み中...</span>
          </Spinner>
          <p className="mt-2">認証状態を確認しています...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // リダイレクト中
  }

  return children;
}