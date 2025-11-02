import { useAtomValue } from '../lib/jotai';
import LocaleSwitcher from '../components/LocaleSwitcher';
import UserMenu from '../components/UserMenu';
import { userSubAtom } from '../components/atoms';

export function AuthSwitcher() {
  const userSub = useAtomValue(userSubAtom);
  
  // Show UserMenu if authenticated, LocaleSwitcher otherwise
  return userSub ? <UserMenu /> : <LocaleSwitcher />;
}

