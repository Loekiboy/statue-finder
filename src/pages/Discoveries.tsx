import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from '@/components/Sidebar';
import StandbeeldViewer from '@/components/StandbeeldViewer';
import PhotoViewer from '@/components/PhotoViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, MapPin, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DiscoveredModel {
  id: string;
  model_id: string;
  discovered_at: string;
  models: {
    id: string;
    name: string;
    description: string | null;
    file_path: string;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    photo_url: string | null;
  };
}

const Discoveries = () => {
  const { t } = useLanguage();
  const [discoveries, setDiscoveries] = useState<DiscoveredModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    if (user) {
      fetchDiscoveries();
    }
  }, [user]);

  const fetchDiscoveries = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('discovered_models')
      .select(`
        id,
        model_id,
        discovered_at,
        models (
          id,
          name,
          description,
          file_path,
          latitude,
          longitude,
          created_at,
          photo_url
        )
      `)
      .eq('user_id', user.id)
      .order('discovered_at', { ascending: false });

    if (error) {
      toast.error('Fout bij ophalen gevonden modellen');
      console.error(error);
    } else {
      setDiscoveries(data || []);
    }
    setLoading(false);
  };


  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      
      <main className="min-h-screen md:pl-24 p-6 md:p-12 pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">{t('Gevonden Standbeelden', 'Discovered Statues')}</h1>
            <p className="text-muted-foreground">{t('Alle standbeelden die je hebt ontdekt', 'All statues you have discovered')}</p>
          </div>

          {selectedModel ? (
            <div className="space-y-4">
              <Button onClick={() => { setSelectedModel(null); setShowPhotoViewer(false); }} variant="outline">
                {t('← Terug naar overzicht', '← Back to overview')}
              </Button>
              {showPhotoViewer && selectedModel.photo_url ? (
                <PhotoViewer
                  photoUrl={selectedModel.photo_url}
                  name={selectedModel.name}
                  description={selectedModel.description}
                  onClose={() => { setSelectedModel(null); setShowPhotoViewer(false); }}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedModel.name}</CardTitle>
                    {selectedModel.description && (
                      <CardDescription>{selectedModel.description}</CardDescription>
                    )}
                    {selectedModel.latitude && selectedModel.longitude && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {selectedModel.latitude.toFixed(4)}°N, {selectedModel.longitude.toFixed(4)}°E
                        </span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="h-[600px] w-full rounded-lg overflow-hidden bg-gradient-to-br from-background to-muted relative z-50">
                      <StandbeeldViewer 
                        onClose={() => setSelectedModel(null)} 
                        modelPath={selectedModel.file_path}
                        autoRotate={true}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <>
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {t('Gevonden standbeelden aan het ophalen...', 'Fetching discovered statues...')}
                  </p>
                </div>
              )}

              {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {discoveries.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <p className="text-muted-foreground text-lg">
                    {t('Nog geen standbeelden gevonden. Ga naar de kaart en ontdek je eerste model!', 'No statues found yet. Go to the map and discover your first model!')}
                  </p>
                </div>
              ) : (
                discoveries.map((discovery) => (
                  <Card key={discovery.id} className="hover:shadow-[var(--shadow-elevated)] transition-shadow animate-fade-in">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{discovery.models.name}</CardTitle>
                        <span className="text-2xl">🎉</span>
                      </div>
                      {discovery.models.description && (
                        <CardDescription className="line-clamp-2">{discovery.models.description}</CardDescription>
                      )}
                      {discovery.models.latitude && discovery.models.longitude && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {discovery.models.latitude.toFixed(4)}°N, {discovery.models.longitude.toFixed(4)}°E
                          </span>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {t('Gevonden op', 'Discovered on')} {new Date(discovery.discovered_at).toLocaleDateString('nl-NL')}
                          </span>
                        </div>
                        <Button 
                          onClick={() => {
                            setSelectedModel(discovery.models);
                            if (discovery.models.photo_url && !discovery.models.file_path) {
                              setShowPhotoViewer(true);
                            }
                          }}
                          size="sm"
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          {t('Bekijk', 'View')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Discoveries;