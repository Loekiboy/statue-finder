import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import StandbeeldViewer from '@/components/StandbeeldViewer';
import PhotoViewer from '@/components/PhotoViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Trash2, Lock, MapPin, Upload as UploadIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SearchBar } from '@/components/SearchBar';

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

interface OSMStatue {
  id: number;
  lat: number;
  lon: number;
  tags: {
    name?: string;
    historic?: string;
    tourism?: string;
    artwork_type?: string;
  };
}

const Models = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [osmStatues, setOsmStatues] = useState<OSMStatue[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [discoveries, setDiscoveries] = useState<DiscoveredModel[]>([]);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingOSM, setLoadingOSM] = useState(false);

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
  }, [user]);

  // Separate effect for geolocation and OSM statues that runs on mount
  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          fetchOSMStatues(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log('Location access denied or error:', error);
        }
      );
    }
  }, []); // Run only on mount

  const fetchModels = async () => {
    setLoadingModels(true);
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
    setLoadingModels(false);
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

  const fetchOSMStatues = async (lat: number, lon: number) => {
    setLoadingOSM(true);
    const radius = 5000; // 5km radius
    const query = `
      [out:json];
      (
        node["historic"="memorial"](around:${radius},${lat},${lon});
        node["historic"="monument"](around:${radius},${lat},${lon});
        node["tourism"="artwork"]["artwork_type"="statue"](around:${radius},${lat},${lon});
      );
      out body;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setOsmStatues(data.elements || []);
    } catch (error) {
      console.error('Error fetching OSM statues:', error);
      toast.error(t('Fout bij ophalen standbeelden van OpenStreetMap', 'Error fetching statues from OpenStreetMap'));
    } finally {
      setLoadingOSM(false);
    }
  };

  const navigateToMap = (lat: number, lon: number) => {
    localStorage.setItem('mapFocus', JSON.stringify({ lat, lon, zoom: 18 }));
    navigate('/');
  };

  const navigateToUpload = (lat: number, lon: number, name: string) => {
    localStorage.setItem('uploadLocation', JSON.stringify({ lat, lon, name }));
    navigate('/upload');
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
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

  // Combine models and OSM statues, then sort by distance
  const combinedItems = [
    ...models.map(model => ({
      type: 'model' as const,
      data: model,
      distance: userLocation && model.latitude && model.longitude
        ? calculateDistance(userLocation.lat, userLocation.lon, model.latitude, model.longitude)
        : Infinity
    })),
    ...osmStatues
      .filter(statue => {
        // Filter out OSM statues that already have a model
        return !models.some(m => 
          m.latitude && m.longitude &&
          Math.abs(m.latitude - statue.lat) < 0.0001 && 
          Math.abs(m.longitude - statue.lon) < 0.0001
        );
      })
      .map(statue => ({
        type: 'osm' as const,
        data: statue,
        distance: userLocation
          ? calculateDistance(userLocation.lat, userLocation.lon, statue.lat, statue.lon)
          : Infinity
      }))
  ].sort((a, b) => a.distance - b.distance);

  const handleDelete = async (modelId: string, filePath: string) => {
    if (!confirm(t('Weet je zeker dat je dit model wilt verwijderen?', 'Are you sure you want to delete this model?'))) return;

    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('models')
        .remove([filePath]);

      if (storageError) {
        toast.error(t('Fout bij verwijderen bestand', 'Error deleting file'));
        console.error(storageError);
        return;
      }
    }

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
      if (selectedModel) {
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
          
          {/* Search Bar */}
          {!selectedModel && (
            <div className="mb-6">
              <SearchBar 
                models={models} 
                onResultClick={(result) => {
                  if (result.type === 'model') {
                    const model = models.find(m => m.id === result.id);
                    if (model) {
                      setSelectedModel(model);
                      if (model.photo_url && !model.file_path) {
                        setShowPhotoViewer(true);
                      }
                    }
                  } else {
                    // Voor municipale kunstwerken, navigeer naar de kaart
                    navigate(`/?kunstwerk=${result.type}-${result.id}`);
                  }
                }}
              />
            </div>
          )}

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
                    ) : selectedModel.file_path && selectedModel.file_path !== '' ? (
                      <StandbeeldViewer 
                        onClose={() => setSelectedModel(null)} 
                        modelPath={selectedModel.file_path}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">
                          {t('Geen 3D model of foto beschikbaar', 'No 3D model or photo available')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Loading state for models */}
              {loadingModels && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {t('Modellen aan het ophalen...', 'Fetching models...')}
                  </p>
                </div>
              )}

              {/* Loading state for OSM statues */}
              {loadingOSM && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {t('Standbeelden van OpenStreetMap aan het ophalen...', 'Fetching statues from OpenStreetMap...')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {!loadingModels && !loadingOSM && combinedItems.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <p className="text-muted-foreground text-lg">
                    {user ? t('Nog geen modellen gevonden. Upload je eerste model!', 'No models found yet. Upload your first model!') : t('Nog geen modellen gevonden. Log in om modellen te uploaden.', 'No models found yet. Log in to upload models.')}
                  </p>
                </div>
              ) : (
                combinedItems.map((item, index) => {
                  if (item.type === 'model') {
                    const model = item.data;
                    const discovered = isModelDiscovered(model.id);
                    const distance = item.distance !== Infinity ? item.distance : null;
                    
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
                                      // Show photo viewer if there's no 3D model file or if there's a photo but no 3D file
                                      if (model.photo_url && (!model.file_path || model.file_path === '')) {
                                        setShowPhotoViewer(true);
                                      } else {
                                        setShowPhotoViewer(false);
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
                  } else {
                    const statue = item.data;
                    const distance = item.distance !== Infinity ? item.distance : null;
                    const name = statue.tags.name || t('Onbekend standbeeld', 'Unknown statue');

                    return (
                      <Card key={`osm-${statue.id}`} className="hover:shadow-[var(--shadow-elevated)] transition-shadow border-dashed">
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
                              <CardTitle className="text-lg">{name}</CardTitle>
                            </div>
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                          <CardDescription className="line-clamp-2">
                            {t('Nog geen 3D model beschikbaar', 'No 3D model available yet')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              OpenStreetMap
                            </p>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button 
                                onClick={() => navigateToMap(statue.lat, statue.lon)}
                                size="sm"
                                variant="outline"
                                className="gap-2 flex-1 sm:flex-initial"
                              >
                                <Eye className="h-4 w-4" />
                                {t('Bekijk', 'View')}
                              </Button>
                              <Button 
                                onClick={() => navigateToUpload(statue.lat, statue.lon, name)}
                                size="sm"
                                className="flex-1 sm:flex-initial"
                              >
                                <UploadIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                })
              )}
            </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Models;