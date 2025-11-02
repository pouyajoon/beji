import { Routes, Route } from 'react-router-dom';
import { JotaiProvider } from '../components/JotaiProvider';
import { LanguageProvider } from '../components/LanguageProvider';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import WorldPage from './pages/WorldPage';

export default function App() {
  return (
    <JotaiProvider>
      <LanguageProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:locale" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/world/:id" element={<WorldPage />} />
        </Routes>
      </LanguageProvider>
    </JotaiProvider>
  );
}

