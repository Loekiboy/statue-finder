import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from '@/components/Sidebar';
import StandbeeldViewer from '@/components/StandbeeldViewer';
import PhotoViewer from '@/components/PhotoViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface Model {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  created_at: string;
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
}

interface DiscoveredModel {
  model_id: string;
}

const Models = () => {
  const { t } = useLanguage();
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [discoveries, setDiscoveries] = useState<DiscoveredModel[]>([]);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchModels();
    if (user) {
      fetchDiscoveries();
    }
    
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied or error:', error);
        }
      );
    }
  }, [user]);

  const fetchModels = async () => {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(t('Fout bij ophalen modellen', 'Error fetching models'));
      console.error(error);
    } else {
      setModels(data || []);
    }
  };

  const fetchDiscoveries = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('discovered_models')
      .select('model_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching discoveries:', error);
    } else {
      setDiscoveries(data || []);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const isModelDiscovered = (modelId: string) => {
    return discoveries.some(d => d.model_id === modelId);
  };

  const sortedModels = [...models].sort((a, b) => {
    if (!userLocation || !a.latitude || !a.longitude || !b.latitude || !b.longitude) {
      return 0;
    }
    const distA = calculateDistance(userLocation.lat, userLocation.lon, a.latitude, a.longitude);
    const distB = calculateDistance(userLocation.lat, userLocation.lon, b.latitude, b.longitude);
    return distA - distB;
  });

  const handleDelete = async (modelId: string, filePath: string) => {
    if (!confirm(t('Weet je zeker dat je dit model wilt verwijderen?', 'Are you sure you want to delete this model?'))) return;

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('models')
      .remove([filePath]);

    if (storageError) {
      toast.error(t('Fout bij verwijderen bestand', 'Error deleting file'));
      console.error(storageError);
      return;
    }

    // Delete database record
    const { error: dbError } = await supabase
      .from('models')
      .delete()
      .eq('id', modelId);

    if (dbError) {
      toast.error(t('Fout bij verwijderen model', 'Error deleting model'));
      console.error(dbError);
    } else {
      toast.success(t('Model verwijderd!', 'Model deleted!'));
      fetchModels();
      if (selectedModel?.id === modelId) {
        setSelectedModel(null);
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      
      <main className="min-h-screen md:pl-20 lg:pl-24 p-6 md:p-12 pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">{t('3D Modellen Collectie', '3D Models Collection')}</h1>
            <p className="text-muted-foreground">{t('Bekijk alle geüploade 3D modellen', 'View all uploaded 3D models')}</p>
          </div>

          {selectedModel ? (
            <div className="space-y-4">
              <Button onClick={() => { setSelectedModel(null); setShowPhotoViewer(false); }} variant="outline">
                {t('← Terug naar overzicht', '← Back to overview')}
              </Button>
              <Card>
                <CardHeader>
                  <CardTitle>{selectedModel.name}</CardTitle>
                  {selectedModel.description && (
                    <CardDescription>{selectedModel.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="h-[600px] w-full rounded-lg overflow-hidden bg-gradient-to-br from-background to-muted relative z-50">
                    {showPhotoViewer && selectedModel.photo_url ? (
                      <PhotoViewer 
                        onClose={() => { setSelectedModel(null); setShowPhotoViewer(false); }} 
                        photoUrl={selectedModel.photo_url}
                      />
                    ) : (
                      <StandbeeldViewer 
                        onClose={() => setSelectedModel(null)} 
                        modelPath={selectedModel.file_path}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedModels.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <p className="text-muted-foreground text-lg">
                    {user ? t('Nog geen modellen gevonden. Upload je eerste model!', 'No models found yet. Upload your first model!') : t('Nog geen modellen gevonden. Log in om modellen te uploaden.', 'No models found yet. Log in to upload models.')}
                  </p>
                </div>
              ) : (
                sortedModels.map((model) => {
                  const discovered = isModelDiscovered(model.id);
                  const distance = userLocation && model.latitude && model.longitude
                    ? calculateDistance(userLocation.lat, userLocation.lon, model.latitude, model.longitude)
                    : null;
                  
                  return (
                    <Card key={model.id} className={`hover:shadow-[var(--shadow-elevated)] transition-shadow ${!discovered ? 'opacity-60' : ''}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {distance !== null && (
                              <p className="text-xs text-muted-foreground mb-1">
                                {distance < 1 
                                  ? `${Math.round(distance * 1000)} m`
                                  : `${distance.toFixed(1)} km`
                                }
                              </p>
                            )}
                            <CardTitle className="text-lg">{model.name}</CardTitle>
                          </div>
                          {!discovered && <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                        </div>
                        {model.description && (
                          <CardDescription className="line-clamp-2">{model.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(model.created_at).toLocaleDateString('nl-NL')}
                          </p>
                          <div className="flex gap-2">
                            {discovered ? (
                              <>
                                <Button 
                                  onClick={() => {
                                    setSelectedModel(model);
                                    if (model.photo_url && !model.file_path) {
                                      setShowPhotoViewer(true);
                                    }
                                  }}
                                  size="sm"
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  {t('Bekijk', 'View')}
                                </Button>
                                {user?.id === model.user_id && (
                                  <Button 
                                    onClick={() => handleDelete(model.id, model.file_path)}
                                    size="sm"
                                    variant="destructive"
                                    className="gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Button 
                                size="sm"
                                variant="outline"
                                disabled
                                className="gap-2"
                              >
                                <Lock className="h-4 w-4" />
                                {t('Vergrendeld', 'Locked')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Models;
