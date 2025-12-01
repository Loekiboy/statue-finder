import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AuthRequired from "@/components/AuthRequired";

interface Favorite {
  id: string;
  kunstwerk_id: string | null;
  model_id: string | null;
  created_at: string;
  artwork?: any;
}

const Favorites = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      loadFavorites();
    } else {
      setLoading(false);
    }
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

  const removeFavorite = async (id: string) => {
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setFavorites(favorites.filter(f => f.id !== id));
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
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mijn Favorieten</h1>
        <p className="text-muted-foreground">Kunstwerken die je hebt opgeslagen</p>
      </div>

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">
              Je hebt nog geen favorieten opgeslagen
            </p>
            <Button onClick={() => navigate("/")}>
              <MapPin className="mr-2 h-4 w-4" />
              Ontdek kunstwerken
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {favorites.map((favorite) => (
            <Card key={favorite.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">
                    {favorite.kunstwerk_id || favorite.model_id || "Kunstwerk"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFavorite(favorite.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardTitle>
                <CardDescription>
                  Toegevoegd: {new Date(favorite.created_at).toLocaleDateString("nl-NL")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
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
