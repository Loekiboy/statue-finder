import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import StandbeeldViewer from '@/components/StandbeeldViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, MapPin, Calendar } from 'lucide-react';
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
  };
}

const Discoveries = () => {
  const [discoveries, setDiscoveries] = useState<DiscoveredModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [user, setUser] = useState<any>(null);

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
          created_at
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
  };

  const t = {
    title: 'Gevonden Standbeelden',
    subtitle: 'Alle standbeelden die je hebt ontdekt',
    noDiscoveries: 'Nog geen standbeelden gevonden. Ga naar de kaart en ontdek je eerste model!',
    discovered: 'Gevonden op',
    view: 'Bekijk',
    backToOverview: '← Terug naar overzicht',
  };

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      
      <main className="min-h-screen md:pl-24 p-6 md:p-12 pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">{t.title}</h1>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </div>

          {selectedModel ? (
            <div className="space-y-4">
              <Button onClick={() => setSelectedModel(null)} variant="outline">
                {t.backToOverview}
              </Button>
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
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {discoveries.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <p className="text-muted-foreground text-lg">
                    {t.noDiscoveries}
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
                            {t.discovered} {new Date(discovery.discovered_at).toLocaleDateString('nl-NL')}
                          </span>
                        </div>
                        <Button 
                          onClick={() => setSelectedModel(discovery.models)}
                          size="sm"
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          {t.view}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Discoveries;