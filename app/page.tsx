import LocaleSwitcher from '../components/LocaleSwitcher';
import { StartPage } from '../components/StartPage';

export default function HomePage() {
  return (
    <div style={{ padding: 0, minHeight: '100vh', position: 'relative' }}>
      <div style={{ 
        position: 'fixed', 
        top: 'max(clamp(8px, 2vw, 12px), env(safe-area-inset-top, 0px))', 
        right: 'max(clamp(8px, 2vw, 12px), env(safe-area-inset-right, 0px))', 
        zIndex: 1000,
      }}>
        <LocaleSwitcher />
      </div>
      <StartPage />
    </div>
  );
}


