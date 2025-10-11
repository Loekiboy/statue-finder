import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Upload, LogIn, LogOut, Boxes } from 'lucide-react';
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="fixed left-0 top-0 z-20 flex h-screen w-16 flex-col gap-4 bg-card p-3 shadow-[var(--shadow-elevated)]">
      <button 
        onClick={() => navigate('/')}
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90"
      >
        <Home className="h-5 w-5" />
      </button>

      <button 
        onClick={() => navigate('/models')}
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-all hover:bg-accent/90"
      >
        <Boxes className="h-5 w-5" />
      </button>
      
      {user && (
        <button 
          onClick={() => navigate('/upload')}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-all hover:bg-secondary/90"
        >
          <Upload className="h-5 w-5" />
        </button>
      )}

      {user ? (
        <button 
          onClick={handleLogout}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive text-destructive-foreground transition-all hover:bg-destructive/90"
        >
          <LogOut className="h-5 w-5" />
        </button>
      ) : (
        <button 
          onClick={() => navigate('/auth')}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-all hover:bg-accent/90"
        >
          <LogIn className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default Sidebar;
