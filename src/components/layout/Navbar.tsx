import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Home, Users, User, Wallet, LogOut, LogIn, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NotificationDropdown } from './NotificationDropdown';
import { SearchDialog } from './SearchDialog';

export const Navbar = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);

    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setDarkMode(!darkMode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 sm:h-20 items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1">
          <img src="/fun-profile-logo.jpg" alt="FUN Profile" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 ring-2 ring-primary/20 cursor-pointer" onClick={() => navigate('/')} />
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-primary-dark font-semibold hover:text-primary">
              <Home className="w-4 h-4 mr-2 text-gold animate-pulse drop-shadow-[0_0_8px_hsl(var(--gold-glow))]" />
              Feed
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/friends')} className="text-primary-dark font-semibold hover:text-primary">
              <Users className="w-4 h-4 mr-2 text-gold animate-pulse drop-shadow-[0_0_8px_hsl(var(--gold-glow))]" />
              Friends
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="text-primary-dark font-semibold hover:text-primary">
              <User className="w-4 h-4 mr-2 text-gold animate-pulse drop-shadow-[0_0_8px_hsl(var(--gold-glow))]" />
              Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/wallet')} className="text-primary-dark font-semibold hover:text-primary">
              <Wallet className="w-4 h-4 mr-2 text-gold animate-pulse drop-shadow-[0_0_8px_hsl(var(--gold-glow))]" />
              Wallet
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <div className="md:hidden flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 text-gold drop-shadow-[0_0_6px_hsl(var(--gold-glow))]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/friends')}>
              <Users className="w-4 h-4 text-gold drop-shadow-[0_0_6px_hsl(var(--gold-glow))]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/profile')}>
              <User className="w-4 h-4 text-gold drop-shadow-[0_0_6px_hsl(var(--gold-glow))]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/wallet')}>
              <Wallet className="w-4 h-4 text-gold drop-shadow-[0_0_6px_hsl(var(--gold-glow))]" />
            </Button>
          </div>
          <SearchDialog />
          <NotificationDropdown />
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          {isLoggedIn ? (
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10 text-primary-dark font-semibold hover:text-primary" onClick={handleLogout}>
              <LogOut className="w-4 h-4 sm:mr-2 text-gold drop-shadow-[0_0_6px_hsl(var(--gold-glow))]" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10 text-primary-dark font-semibold hover:text-primary" onClick={handleLogin}>
              <LogIn className="w-4 h-4 sm:mr-2 text-gold drop-shadow-[0_0_6px_hsl(var(--gold-glow))]" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};
