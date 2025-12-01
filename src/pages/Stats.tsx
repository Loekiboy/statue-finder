import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Camera, Package, MapPin, Heart, MessageCircle, Star, TrendingUp, Award } from "lucide-react";
import AuthRequired from "@/components/AuthRequired";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface Stats {
  totalDiscoveries: number;
  totalPhotos: number;
  totalModels: number;
  totalCities: number;
  totalFavorites: number;
  totalComments: number;
  totalLikes: number;
  achievements: number;
  citiesData: { city: string; count: number }[];
  monthlyData: { month: string; discoveries: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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
    citiesData: [],
    monthlyData: [],
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
        supabase.from("discovered_kunstwerken").select("city, discovered_at").eq("user_id", userId),
        supabase.from("models").select("*").eq("user_id", userId),
        supabase.from("favorites").select("*", { count: "exact" }).eq("user_id", userId),
        supabase.from("comments").select("*", { count: "exact" }).eq("user_id", userId),
        supabase.from("likes").select("*", { count: "exact" }).eq("user_id", userId),
        supabase.from("user_achievements").select("*", { count: "exact" }).eq("user_id", userId),
      ]);

      // Process cities data
      const cityCount = new Map<string, number>();
      discoveries.data?.forEach(d => {
        cityCount.set(d.city, (cityCount.get(d.city) || 0) + 1);
      });
      const citiesData = Array.from(cityCount.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count);

      // Process monthly data (last 6 months)
      const monthlyCount = new Map<string, number>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = date.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' });
        monthlyCount.set(key, 0);
      }

      discoveries.data?.forEach(d => {
        const date = new Date(d.discovered_at);
        const key = date.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' });
        if (monthlyCount.has(key)) {
          monthlyCount.set(key, (monthlyCount.get(key) || 0) + 1);
        }
      });

      const monthlyData = Array.from(monthlyCount.entries()).map(([month, discoveries]) => ({
        month,
        discoveries,
      }));

      const photosCount = models.data?.filter(m => m.photo_url).length || 0;

      setStats({
        totalDiscoveries: discoveries.data?.length || 0,
        totalPhotos: photosCount,
        totalModels: models.data?.length || 0,
        totalCities: citiesData.length,
        totalFavorites: favorites.count || 0,
        totalComments: comments.count || 0,
        totalLikes: likes.count || 0,
        achievements: userAchievements.count || 0,
        citiesData,
        monthlyData,
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
    { title: "Verzamelde Kunstwerken", value: stats.totalDiscoveries, icon: Trophy, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
    { title: "Geüploade Foto's", value: stats.totalPhotos, icon: Camera, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { title: "3D Modellen", value: stats.totalModels, icon: Package, color: "text-purple-500", bgColor: "bg-purple-500/10" },
    { title: "Bezochte Steden", value: stats.totalCities, icon: MapPin, color: "text-green-500", bgColor: "bg-green-500/10" },
    { title: "Favorieten", value: stats.totalFavorites, icon: Heart, color: "text-red-500", bgColor: "bg-red-500/10" },
    { title: "Comments", value: stats.totalComments, icon: MessageCircle, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
    { title: "Likes Gegeven", value: stats.totalLikes, icon: Heart, color: "text-pink-500", bgColor: "bg-pink-500/10" },
    { title: "Achievements", value: stats.achievements, icon: Star, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  ];

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          Mijn Statistieken
        </h1>
        <p className="text-muted-foreground text-lg">Jouw activiteit in detail</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat, index) => (
          <Card key={stat.title} className="hover:shadow-lg transition-all duration-300 hover-scale animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              {stat.value > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Top contributor
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Monthly Discoveries */}
        {stats.monthlyData.length > 0 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Ontdekkingen per Maand</CardTitle>
              <CardDescription>Laatste 6 maanden</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="discoveries" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Cities Distribution */}
        {stats.citiesData.length > 0 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Ontdekkingen per Stad</CardTitle>
              <CardDescription>Jouw meest bezochte steden</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.citiesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ city, count }) => `${city}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.citiesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity Bar Chart */}
      {stats.citiesData.length > 0 && (
        <Card className="animate-fade-in mb-8">
          <CardHeader>
            <CardTitle>Activiteit Overzicht</CardTitle>
            <CardDescription>Vergelijking van verschillende activiteiten</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Ontdekkingen', value: stats.totalDiscoveries },
                { name: "Foto's", value: stats.totalPhotos },
                { name: 'Modellen', value: stats.totalModels },
                { name: 'Comments', value: stats.totalComments },
                { name: 'Likes', value: stats.totalLikes },
                { name: 'Favorieten', value: stats.totalFavorites },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stats.totalDiscoveries === 0 && (
        <Card className="animate-fade-in">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">
              Nog geen activiteit
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Begin met het ontdekken van kunstwerken om je statistieken te zien groeien!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Stats;
