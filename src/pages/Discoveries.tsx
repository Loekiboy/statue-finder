import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from '@/components/Sidebar';
import AuthRequired from '@/components/AuthRequired';
import StandbeeldViewer from '@/components/StandbeeldViewer';
import PhotoViewer from '@/components/PhotoViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, MapPin, Calendar, Loader2, Trophy, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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

interface DiscoveredKunstwerk {
  id: string;
  kunstwerk_id: string;
  city: string;
  discovered_at: string;
  photo_url: string | null;
}

const cityNames: Record<string, { nl: string; en: string }> = {
  nijmegen: { nl: 'Nijmegen', en: 'Nijmegen' },
  utrecht: { nl: 'Utrecht', en: 'Utrecht' },
  alkmaar: { nl: 'Alkmaar', en: 'Alkmaar' },
  denhaag: { nl: 'Den Haag', en: 'The Hague' },
  delft: { nl: 'Delft', en: 'Delft' },
  dublin: { nl: 'Dublin', en: 'Dublin' },
  antoing: { nl: 'Antoing', en: 'Antoing' },
  drenthe: { nl: 'Drenthe', en: 'Drenthe' },
};

const Discoveries = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [discoveries, setDiscoveries] = useState<DiscoveredModel[]>([]);
  const [kunstwerkDiscoveries, setKunstwerkDiscoveries] = useState<DiscoveredKunstwerk[]>([]);
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
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
    
    // Fetch discovered models
    const { data: modelData, error: modelError } = await supabase
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

    if (modelError) {
      console.error('Error fetching models:', modelError);
    } else {
      setDiscoveries(modelData || []);
    }

    // Fetch discovered kunstwerken
    const { data: kunstwerkData, error: kunstwerkError } = await (supabase as any)
      .from('discovered_kunstwerken')
      .select('*')
      .eq('user_id', user.id)
      .order('discovered_at', { ascending: false });

    if (kunstwerkError) {
      console.error('Error fetching kunstwerken:', kunstwerkError);
    } else {
      setKunstwerkDiscoveries(kunstwerkData || []);
    }

    setLoading(false);
  };

  const handleViewOnMap = (city: string, kunstwerkId: string) => {
    // Navigate to map and focus on the kunstwerk
    localStorage.setItem('mapFocus', JSON.stringify({ kunstwerk: `${city}-${kunstwerkId}` }));
    navigate('/');
  };

  const totalDiscoveries = discoveries.length + kunstwerkDiscoveries.length;

  if (authChecked && !user) {
    return (
      <AuthRequired 
        title={t('Aanmelden vereist', 'Sign in required')}
        description={t('Log in om je verzamelde kunstwerken te bekijken en nieuwe te ontdekken.', 'Sign in to view your collected artworks and discover new ones.')}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      
      <main className="min-h-screen md:pl-24 p-6 md:p-12 pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <h1 className="text-4xl font-bold text-foreground">{t('Mijn Verzameling', 'My Collection')}</h1>
            </div>
            <p className="text-muted-foreground">
              {t(`Je hebt ${totalDiscoveries} items verzameld`, `You have collected ${totalDiscoveries} items`)}
            </p>
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
                    {t('Verzameling laden...', 'Loading collection...')}
                  </p>
                </div>
              )}

              {!loading && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="all" className="gap-2">
                      <Trophy className="h-4 w-4" />
                      {t('Alles', 'All')} ({totalDiscoveries})
                    </TabsTrigger>
                    <TabsTrigger value="models" className="gap-2">
                      🎨 {t('3D Modellen', '3D Models')} ({discoveries.length})
                    </TabsTrigger>
                    <TabsTrigger value="kunstwerken" className="gap-2">
                      🏛️ {t('Kunstwerken', 'Artworks')} ({kunstwerkDiscoveries.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    {totalDiscoveries === 0 ? (
                      <div className="text-center py-16">
                        <Trophy className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground text-lg">
                          {t('Nog niets verzameld. Ga naar de kaart en ontdek je eerste kunstwerk!', 'Nothing collected yet. Go to the map and discover your first artwork!')}
                        </p>
                        <Button onClick={() => navigate('/')} className="mt-4">
                          {t('Naar de kaart', 'Go to map')}
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Combine and sort all discoveries */}
                        {[
                          ...discoveries.map(d => ({ type: 'model' as const, data: d, date: d.discovered_at })),
                          ...kunstwerkDiscoveries.map(k => ({ type: 'kunstwerk' as const, data: k, date: k.discovered_at }))
                        ]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((item) => (
                            item.type === 'model' ? (
                              <ModelCard 
                                key={`model-${item.data.id}`} 
                                discovery={item.data as DiscoveredModel} 
                                t={t} 
                                onView={(model) => {
                                  setSelectedModel(model);
                                  if (model.photo_url && !model.file_path) {
                                    setShowPhotoViewer(true);
                                  }
                                }}
                              />
                            ) : (
                              <KunstwerkCard 
                                key={`kunstwerk-${item.data.id}`} 
                                discovery={item.data as DiscoveredKunstwerk} 
                                t={t}
                                language={language}
                                onViewOnMap={handleViewOnMap}
                              />
                            )
                          ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="models">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {discoveries.length === 0 ? (
                        <div className="col-span-full text-center py-16">
                          <p className="text-muted-foreground text-lg">
                            {t('Nog geen 3D modellen verzameld.', 'No 3D models collected yet.')}
                          </p>
                        </div>
                      ) : (
                        discoveries.map((discovery) => (
                          <ModelCard 
                            key={discovery.id} 
                            discovery={discovery} 
                            t={t} 
                            onView={(model) => {
                              setSelectedModel(model);
                              if (model.photo_url && !model.file_path) {
                                setShowPhotoViewer(true);
                              }
                            }}
                          />
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="kunstwerken">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {kunstwerkDiscoveries.length === 0 ? (
                        <div className="col-span-full text-center py-16">
                          <p className="text-muted-foreground text-lg">
                            {t('Nog geen kunstwerken verzameld.', 'No artworks collected yet.')}
                          </p>
                        </div>
                      ) : (
                        kunstwerkDiscoveries.map((discovery) => (
                          <KunstwerkCard 
                            key={discovery.id} 
                            discovery={discovery} 
                            t={t}
                            language={language}
                            onViewOnMap={handleViewOnMap}
                          />
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

// Model Card Component
const ModelCard = ({ 
  discovery, 
  t, 
  onView 
}: { 
  discovery: DiscoveredModel; 
  t: (nl: string, en: string) => string;
  onView: (model: any) => void;
}) => (
  <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow animate-fade-in">
    <CardHeader>
      <div className="flex items-start justify-between">
        <CardTitle className="text-lg">{discovery.models.name}</CardTitle>
        <span className="text-2xl">🎨</span>
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
            {new Date(discovery.discovered_at).toLocaleDateString('nl-NL')}
          </span>
        </div>
        <Button 
          onClick={() => onView(discovery.models)}
          size="sm"
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          {t('Bekijk', 'View')}
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Kunstwerk Card Component
const KunstwerkCard = ({ 
  discovery, 
  t,
  language,
  onViewOnMap 
}: { 
  discovery: DiscoveredKunstwerk; 
  t: (nl: string, en: string) => string;
  language: string;
  onViewOnMap: (city: string, kunstwerkId: string) => void;
}) => {
  const cityName = cityNames[discovery.city]?.[language === 'nl' ? 'nl' : 'en'] || discovery.city;
  
  // Try to extract a readable name from the kunstwerk_id
  const displayName = discovery.kunstwerk_id.includes('-') 
    ? discovery.kunstwerk_id.split('-').slice(1).join(' ').replace(/_/g, ' ')
    : discovery.kunstwerk_id;

  return (
    <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow animate-fade-in overflow-hidden">
      {discovery.photo_url && (
        <div className="h-40 bg-muted overflow-hidden">
          <img 
            src={discovery.photo_url} 
            alt={displayName}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      )}
      <CardHeader className={discovery.photo_url ? 'pt-3' : ''}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate capitalize">{displayName}</CardTitle>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {cityName}
              </span>
            </div>
          </div>
          <span className="text-2xl">🏛️</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(discovery.discovered_at).toLocaleDateString('nl-NL')}
            </span>
          </div>
          <div className="flex gap-2">
            {!discovery.photo_url && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ImageIcon className="h-3 w-3" />
                <span>{t('Geen foto', 'No photo')}</span>
              </div>
            )}
            <Button 
              onClick={() => onViewOnMap(discovery.city, discovery.kunstwerk_id)}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <MapPin className="h-4 w-4" />
              {t('Kaart', 'Map')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Discoveries;