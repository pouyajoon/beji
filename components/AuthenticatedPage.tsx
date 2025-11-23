import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { userSubAtom } from './atoms';
import { HourglassLoader } from './HourglassLoader';
import { useSetAtom } from '../lib/jotai';

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
        // httpOnly secure cookies are sent automatically with credentials: 'include'
        const response = await fetch('/api/authentication/get-token', {
          credentials: 'include',
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // setUserSub est stable (Jotai), pas besoin dans les dépendances

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
        <HourglassLoader text="Loading..." size={24} />
      </div>
    );
  }

  return <>{children}</>;
}

