import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Upload, LogIn, User as UserIcon, Boxes, Map } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const Sidebar = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

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

  return (
    <div className="fixed left-0 top-0 z-20 flex h-screen w-16 flex-col gap-4 bg-card p-3 shadow-[var(--shadow-elevated)]">
      <button 
        onClick={() => handleNavigation('/')}
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90"
        title="Kaart"
      >
        <Home className="h-5 w-5" />
      </button>

      <button 
        onClick={() => handleNavigation('/discoveries')}
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-all hover:bg-accent/90"
        title="Gevonden Standbeelden"
      >
        <Map className="h-5 w-5" />
      </button>

      <button 
        onClick={() => handleNavigation('/models')}
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-all hover:bg-accent/90"
        title="Alle Modellen"
      >
        <Boxes className="h-5 w-5" />
      </button>
      
      {user && (
        <button 
          onClick={() => handleNavigation('/upload')}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-all hover:bg-secondary/90"
          title="Upload Model"
        >
          <Upload className="h-5 w-5" />
        </button>
      )}

      {user ? (
        <button 
          onClick={() => handleNavigation('/profile')}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all hover:bg-muted/80"
          title="Profiel"
        >
          <UserIcon className="h-5 w-5" />
        </button>
      ) : (
        <button 
          onClick={() => handleNavigation('/auth')}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-all hover:bg-accent/90"
          title="Inloggen"
        >
          <LogIn className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default Sidebar;
