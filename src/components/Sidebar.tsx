import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Upload, LogIn, User as UserIcon, Boxes, Map, Compass } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const navItems = [
    { icon: Map, path: '/', labelNl: 'Kaart', labelEn: 'Map', variant: 'primary' as const },
    { icon: Compass, path: '/discoveries', labelNl: 'Ontdekken', labelEn: 'Discoveries', variant: 'accent' as const },
    { icon: Boxes, path: '/models', labelNl: 'Modellen', labelEn: 'Models', variant: 'accent' as const },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-20 h-screen w-16 bg-card shadow-[var(--shadow-elevated)] hidden md:flex md:flex-col md:gap-3 md:p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]'
                  : 'bg-accent text-accent-foreground hover:bg-accent/90'
              )}
              title={t(item.labelNl, item.labelEn)}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
        
        {user && (
          <button 
            onClick={() => handleNavigation('/upload')}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
              location.pathname === '/upload'
                ? 'bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
            )}
            title={t('Upload', 'Upload')}
          >
            <Upload className="h-5 w-5" />
          </button>
        )}

        {user ? (
          <button 
            onClick={() => handleNavigation('/profile')}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-all mt-auto',
              location.pathname === '/profile'
                ? 'bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
            title={t('Profiel', 'Profile')}
          >
            <UserIcon className="h-5 w-5" />
          </button>
        ) : (
          <button 
            onClick={() => handleNavigation('/auth')}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-all hover:bg-accent/90 mt-auto"
            title={t('Inloggen', 'Login')}
          >
            <LogIn className="h-5 w-5" />
          </button>
        )}
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[2000] border-t border-border bg-card/98 backdrop-blur-sm md:hidden pb-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-all min-w-[60px]',
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]' 
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{t(item.labelNl, item.labelEn)}</span>
              </button>
            );
          })}
          
          {user ? (
            <button 
              onClick={() => handleNavigation('/profile')}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-all min-w-[60px]',
                location.pathname === '/profile'
                  ? 'bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <UserIcon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t('Profiel', 'Profile')}</span>
            </button>
          ) : (
            <button 
              onClick={() => handleNavigation('/auth')}
              className="flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-all text-muted-foreground hover:bg-accent hover:text-accent-foreground min-w-[60px]"
            >
              <LogIn className="h-5 w-5" />
              <span className="text-[10px] font-medium">Login</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
