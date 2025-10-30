import LocaleSwitcher from '../../components/LocaleSwitcher';
import { StartPage } from '../../components/StartPage';

export default function HomeLocalePage() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 10 }}>
        <LocaleSwitcher />
      </div>
      <StartPage />
    </div>
  );
}


