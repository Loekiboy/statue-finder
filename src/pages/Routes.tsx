import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Plus, Trash2, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import AuthRequired from "@/components/AuthRequired";

interface Route {
  id: string;
  name: string;
  description: string | null;
  artwork_ids: any;
  created_at: string;
}

const Routes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteDescription, setNewRouteDescription] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      loadRoutes();
    } else {
      setLoading(false);
    }
  };

  const loadRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error("Error loading routes:", error);
      toast.error("Kon routes niet laden");
    } finally {
      setLoading(false);
    }
  };

  const createRoute = async () => {
    if (!newRouteName.trim()) {
      toast.error("Vul een naam in");
      return;
    }

    if (!user) {
      toast.error("Je moet ingelogd zijn");
      return;
    }

    try {
      const { error } = await supabase
        .from("routes")
        .insert([{
          user_id: user.id,
          name: newRouteName,
          description: newRouteDescription || null,
          artwork_ids: JSON.stringify([]),
        }]);

      if (error) throw error;

      toast.success("Route aangemaakt");
      setNewRouteName("");
      setNewRouteDescription("");
      setDialogOpen(false);
      loadRoutes();
    } catch (error) {
      console.error("Error creating route:", error);
      toast.error("Kon route niet aanmaken");
    }
  };

  const deleteRoute = async (id: string) => {
    try {
      const { error } = await supabase
        .from("routes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setRoutes(routes.filter(r => r.id !== id));
      toast.success("Route verwijderd");
    } catch (error) {
      console.error("Error deleting route:", error);
      toast.error("Kon route niet verwijderen");
    }
  };

  if (!user) {
    return (
      <AuthRequired 
        title="Inloggen vereist"
        description="Log in om routes te maken en te beheren"
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mijn Routes</h1>
          <p className="text-muted-foreground">Plan wandelroutes langs kunstwerken</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nieuwe Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Route Maken</DialogTitle>
              <DialogDescription>
                Maak een wandelroute langs je favoriete kunstwerken
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Route naam"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                />
              </div>
              <div>
                <Textarea
                  placeholder="Beschrijving (optioneel)"
                  value={newRouteDescription}
                  onChange={(e) => setNewRouteDescription(e.target.value)}
                />
              </div>
              <Button onClick={createRoute} className="w-full">
                Route Aanmaken
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RouteIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">
              Je hebt nog geen routes gemaakt
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Maak je eerste route
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {routes.map((route) => (
            <Card key={route.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{route.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRoute(route.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardTitle>
                {route.description && (
                  <CardDescription>{route.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {Array.isArray(route.artwork_ids) ? route.artwork_ids.length : 0} kunstwerken
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/")}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Bekijk op kaart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Routes;
