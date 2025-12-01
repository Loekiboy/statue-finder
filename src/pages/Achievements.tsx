import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthRequired from "@/components/AuthRequired";
import AchievementsDisplay from "@/components/AchievementsDisplay";
import Sidebar from "@/components/Sidebar";

const Achievements = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthRequired 
        title="Inloggen vereist"
        description="Log in om je achievements te bekijken"
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      
      <main className="min-h-screen md:pl-20 lg:pl-24 p-6 md:p-12 pb-24 md:pb-12">
        <div className="max-w-6xl mx-auto">
          <AchievementsDisplay userId={user.id} />
        </div>
      </main>
    </div>
  );
};

export default Achievements;
