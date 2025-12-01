import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Camera, Package, MapPin, Heart, MessageCircle, Star } from "lucide-react";
import AuthRequired from "@/components/AuthRequired";

interface Stats {
  totalDiscoveries: number;
  totalPhotos: number;
  totalModels: number;
  totalCities: number;
  totalFavorites: number;
  totalComments: number;
  totalLikes: number;
  achievements: number;
}

const Stats = () => {
  const [stats, setStats] = useState<Stats>({
    totalDiscoveries: 0,
    totalPhotos: 0,
    totalModels: 0,
    totalCities: 0,
    totalFavorites: 0,
    totalComments: 0,
    totalLikes: 0,
    achievements: 0,
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      loadStats(user.id);
    } else {
      setLoading(false);
    }
  };

  const loadStats = async (userId: string) => {
    try {
      const [discoveries, models, favorites, comments, likes, userAchievements] = await Promise.all([
        supabase.from("discovered_kunstwerken").select("city", { count: "exact" }).eq("user_id", userId),
        supabase.from("models").select("*", { count: "exact" }).eq("user_id", userId),
        supabase.from("favorites").select("*", { count: "exact" }).eq("user_id", userId),
        supabase.from("comments").select("*", { count: "exact" }).eq("user_id", userId),
        supabase.from("likes").select("*", { count: "exact" }).eq("user_id", userId),
        supabase.from("user_achievements").select("*", { count: "exact" }).eq("user_id", userId),
      ]);

      const cities = new Set(discoveries.data?.map(d => d.city) || []).size;
      const photosCount = models.data?.filter(m => m.photo_url).length || 0;

      setStats({
        totalDiscoveries: discoveries.count || 0,
        totalPhotos: photosCount,
        totalModels: models.count || 0,
        totalCities: cities,
        totalFavorites: favorites.count || 0,
        totalComments: comments.count || 0,
        totalLikes: likes.count || 0,
        achievements: userAchievements.count || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <AuthRequired 
        title="Inloggen vereist"
        description="Log in om je persoonlijke statistieken te bekijken"
      />
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    { title: "Verzamelde Kunstwerken", value: stats.totalDiscoveries, icon: Trophy, color: "text-yellow-500" },
    { title: "Geüploade Foto's", value: stats.totalPhotos, icon: Camera, color: "text-blue-500" },
    { title: "3D Modellen", value: stats.totalModels, icon: Package, color: "text-purple-500" },
    { title: "Bezochte Steden", value: stats.totalCities, icon: MapPin, color: "text-green-500" },
    { title: "Favorieten", value: stats.totalFavorites, icon: Heart, color: "text-red-500" },
    { title: "Comments", value: stats.totalComments, icon: MessageCircle, color: "text-indigo-500" },
    { title: "Likes Gegeven", value: stats.totalLikes, icon: Heart, color: "text-pink-500" },
    { title: "Behaalde Achievements", value: stats.achievements, icon: Star, color: "text-amber-500" },
  ];

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mijn Statistieken</h1>
        <p className="text-muted-foreground">Jouw activiteit in één overzicht</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Stats;
