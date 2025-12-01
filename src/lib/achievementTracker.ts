import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const checkAndUnlockAchievements = async (userId: string) => {
  try {
    // Fetch all achievements
    const { data: allAchievements, error: achievementsError } = await supabase
      .from("achievements")
      .select("*");

    if (achievementsError) throw achievementsError;

    // Fetch user's current achievements
    const { data: userAchievements, error: userAchievementsError } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    if (userAchievementsError) throw userAchievementsError;

    const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);

    // Fetch user stats
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

    // Check each achievement
    for (const achievement of allAchievements || []) {
      if (unlockedIds.has(achievement.id)) continue;

      let shouldUnlock = false;

      switch (achievement.criteria_type) {
        case "discoveries":
          shouldUnlock = stats.discoveries >= achievement.criteria_value;
          break;
        case "photos":
          shouldUnlock = stats.photos >= achievement.criteria_value;
          break;
        case "models":
          shouldUnlock = stats.models >= achievement.criteria_value;
          break;
        case "comments":
          shouldUnlock = stats.comments >= achievement.criteria_value;
          break;
        case "cities":
          shouldUnlock = stats.cities >= achievement.criteria_value;
          break;
      }

      if (shouldUnlock) {
        const { error } = await supabase
          .from("user_achievements")
          .insert({ user_id: userId, achievement_id: achievement.id });

        if (!error) {
          toast.success(`🏆 Achievement Unlocked: ${achievement.name}!`, {
            description: achievement.description,
            duration: 5000,
          });
        }
      }
    }
  } catch (error) {
    console.error("Error checking achievements:", error);
  }
};
