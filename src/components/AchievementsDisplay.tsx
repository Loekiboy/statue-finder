import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  unlocked?: boolean;
  progress?: number;
}

interface AchievementsDisplayProps {
  userId: string;
  compact?: boolean;
}

const AchievementsDisplay = ({ userId, compact = false }: AchievementsDisplayProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  const loadAchievements = async () => {
    try {
      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("*")
        .order("criteria_value", { ascending: true });

      if (achievementsError) throw achievementsError;

      // Fetch user's unlocked achievements
      const { data: userAchievements, error: userError } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId);

      if (userError) throw userError;

      const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);

      // Fetch user stats for progress calculation
      const [discoveries, models, comments] = await Promise.all([
        supabase.from("discovered_kunstwerken").select("city", { count: "exact" }).eq("user_id", userId),
        supabase.from("models").select("*", { count: "exact" }).eq("user_id", userId),
        supabase.from("comments").select("*", { count: "exact" }).eq("user_id", userId),
      ]);

      const stats = {
        discoveries: discoveries.count || 0,
        photos: models.data?.filter(m => m.photo_url).length || 0,
        models: models.count || 0,
        comments: comments.count || 0,
        cities: new Set(discoveries.data?.map(d => d.city) || []).size,
      };

      // Calculate progress for each achievement
      const achievementsWithProgress = allAchievements?.map(achievement => {
        const unlocked = unlockedIds.has(achievement.id);
        let currentValue = 0;

        switch (achievement.criteria_type) {
          case "discoveries":
            currentValue = stats.discoveries;
            break;
          case "photos":
            currentValue = stats.photos;
            break;
          case "models":
            currentValue = stats.models;
            break;
          case "comments":
            currentValue = stats.comments;
            break;
          case "cities":
            currentValue = stats.cities;
            break;
        }

        const progress = Math.min((currentValue / achievement.criteria_value) * 100, 100);

        return {
          ...achievement,
          unlocked,
          progress,
        };
      }) || [];

      setAchievements(achievementsWithProgress);
    } catch (error) {
      console.error("Error loading achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    // Map icon names to actual icon components
    const iconMap: Record<string, any> = {
      trophy: Trophy,
      sparkles: Sparkles,
    };
    return iconMap[iconName] || Trophy;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Achievements
          </CardTitle>
          <CardDescription>
            {unlockedCount} van {totalCount} behaald
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {achievements.slice(0, 8).map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              return (
                <div
                  key={achievement.id}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center transition-all duration-300",
                    achievement.unlocked
                      ? "bg-primary/10 text-primary hover:scale-110"
                      : "bg-muted text-muted-foreground opacity-50"
                  )}
                  title={achievement.name}
                >
                  {achievement.unlocked ? (
                    <IconComponent className="h-6 w-6" />
                  ) : (
                    <Lock className="h-6 w-6" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Achievements
          </h2>
          <p className="text-muted-foreground">
            {unlockedCount} van {totalCount} behaald
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {Math.round((unlockedCount / totalCount) * 100)}%
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {achievements.map((achievement, index) => {
          const IconComponent = getIconComponent(achievement.icon);
          return (
            <Card
              key={achievement.id}
              className={cn(
                "transition-all duration-300 hover-scale animate-fade-in",
                achievement.unlocked
                  ? "border-primary/50 bg-primary/5"
                  : "opacity-75"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-3 rounded-lg transition-all duration-300",
                        achievement.unlocked
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {achievement.unlocked ? (
                        <IconComponent className="h-6 w-6" />
                      ) : (
                        <Lock className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{achievement.name}</CardTitle>
                      <CardDescription>{achievement.description}</CardDescription>
                    </div>
                  </div>
                  {achievement.unlocked && (
                    <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{Math.round(achievement.progress || 0)}%</span>
                  </div>
                  <Progress value={achievement.progress || 0} className="h-2" />
                  {!achievement.unlocked && (
                    <p className="text-xs text-muted-foreground">
                      {achievement.criteria_value} {achievement.criteria_type} benodigd
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsDisplay;
