import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from '../lib/jotai';
import { userSubAtom } from './atoms';

interface AuthenticatedPageProps {
  children: React.ReactNode;
}

export function AuthenticatedPage({ children }: AuthenticatedPageProps) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const setUserSub = useSetAtom(userSubAtom);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/authentication/get-token');
        if (response.ok) {
          const data = await response.json();
          setUserSub(data.userId);
          setIsChecking(false);
        } else {
          // Not authenticated, redirect to login
          setUserSub(null);
          navigate('/login');
        }
      } catch (error) {
        console.error('Failed to check authentication:', error);
        setUserSub(null);
        navigate('/login');
      }
    }
    checkAuth();
  }, [navigate, setUserSub]);

  if (isChecking) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

