import { useEffect, useState } from 'react';
import MapView from '@/components/MapView';
import Sidebar from '@/components/Sidebar';
import UsernameSetupDialog from '@/components/UsernameSetupDialog';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUsername = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();
        
        if (data && !data.username) {
          setShowUsernameDialog(true);
        }
      }
    };

    checkUsername();
  }, []);

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      
      <main className="h-screen md:pl-16">
        <MapView />
      </main>

      {userId && (
        <UsernameSetupDialog
          open={showUsernameDialog}
          onClose={() => setShowUsernameDialog(false)}
          userId={userId}
        />
      )}
    </div>
  );
};

export default Index;
