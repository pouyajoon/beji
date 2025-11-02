import { useParams } from 'react-router-dom';
import { AuthSwitcher } from '../../app/AuthSwitcher';
import { StartPage } from '../../components/StartPage';

export default function HomePage() {
  const params = useParams();
  const locale = params.locale;

  return (
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
        <AuthSwitcher />
      </div>
      <StartPage />
    </div>
  );
}

