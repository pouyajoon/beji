import { AuthenticatedPage } from '../../components/AuthenticatedPage';
import { StartPage } from '../../components/StartPage';
import UserMenu from '../../components/UserMenu';

export default function HomePage() {
  return (
    <AuthenticatedPage>
      <div style={{ padding: 0, minHeight: '100vh', position: 'relative' }}>
        <div
          style={{
            position: 'fixed',
            top: 'max(clamp(8px, 2vw, 12px), env(safe-area-inset-top, 0px))',
            right: 'max(clamp(8px, 2vw, 12px), env(safe-area-inset-right, 0px))',
            zIndex: 1000,
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <UserMenu />
        </div>
        <StartPage />
      </div>
    </AuthenticatedPage>
  );
}

