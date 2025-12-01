import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Trash2, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import AuthRequired from "@/components/AuthRequired";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Favorite {
  id: string;
  kunstwerk_id: string | null;
  model_id: string | null;
  created_at: string;
  artwork?: any;
}

const Favorites = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "kunstwerk" | "model">("all");
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    filterAndSearch();
  }, [favorites, searchQuery, filterType]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      loadFavorites();
      setupRealtimeSubscription();
    } else {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('favorites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
        },
        () => {
          loadFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error("Error loading favorites:", error);
      toast.error("Kon favorieten niet laden");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSearch = () => {
    let filtered = favorites;

    // Filter by type
    if (filterType === "kunstwerk") {
      filtered = filtered.filter(f => f.kunstwerk_id);
    } else if (filterType === "model") {
      filtered = filtered.filter(f => f.model_id);
    }

    // Search
    if (searchQuery.trim()) {
      filtered = filtered.filter(f => 
        (f.kunstwerk_id?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (f.model_id?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredFavorites(filtered);
  };

  const removeFavorite = async (id: string) => {
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Verwijderd uit favorieten");
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Kon niet verwijderen");
    }
  };

  if (!user) {
    return (
      <AuthRequired 
        title="Inloggen vereist"
        description="Log in om je favoriete kunstwerken op te slaan en te bekijken"
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

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Heart className="h-8 w-8 text-red-500" />
          Mijn Favorieten
        </h1>
        <p className="text-muted-foreground text-lg">
          {favorites.length} opgeslagen {favorites.length === 1 ? "kunstwerk" : "kunstwerken"}
        </p>
      </div>

      {/* Search and Filter */}
      {favorites.length > 0 && (
        <div className="mb-6 space-y-4 animate-fade-in">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek in favorieten..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Badge
              variant={filterType === "all" ? "default" : "outline"}
              className="cursor-pointer hover-scale"
              onClick={() => setFilterType("all")}
            >
              Alles ({favorites.length})
            </Badge>
            <Badge
              variant={filterType === "kunstwerk" ? "default" : "outline"}
              className="cursor-pointer hover-scale"
              onClick={() => setFilterType("kunstwerk")}
            >
              Kunstwerken ({favorites.filter(f => f.kunstwerk_id).length})
            </Badge>
            <Badge
              variant={filterType === "model" ? "default" : "outline"}
              className="cursor-pointer hover-scale"
              onClick={() => setFilterType("model")}
            >
              Modellen ({favorites.filter(f => f.model_id).length})
            </Badge>
          </div>
        </div>
      )}

      {/* Empty State */}
      {favorites.length === 0 ? (
        <Card className="animate-fade-in">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Heart className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nog geen favorieten</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Ontdek kunstwerken op de kaart en voeg ze toe aan je favorieten om ze later gemakkelijk terug te vinden
            </p>
            <Button onClick={() => navigate("/")} size="lg">
              <MapPin className="mr-2 h-5 w-5" />
              Ontdek kunstwerken
            </Button>
          </CardContent>
        </Card>
      ) : filteredFavorites.length === 0 ? (
        <Card className="animate-fade-in">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Geen resultaten gevonden voor "{searchQuery}"
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredFavorites.map((favorite, index) => (
            <Card 
              key={favorite.id}
              className={cn(
                "hover:shadow-lg transition-all duration-300 hover-scale animate-fade-in group",
                favorite.kunstwerk_id && "border-l-4 border-l-orange-500",
                favorite.model_id && "border-l-4 border-l-purple-500"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                      <Heart className="h-5 w-5 text-red-500 fill-current" />
                      <span className="truncate">
                        {favorite.kunstwerk_id || favorite.model_id || "Kunstwerk"}
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Toegevoegd: {new Date(favorite.created_at).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFavorite(favorite.id)}
                    className="hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={() => navigate("/")}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Bekijk op kaart
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
