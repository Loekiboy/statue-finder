import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import StandbeeldViewer from '@/components/StandbeeldViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

interface Model {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  created_at: string;
  user_id: string;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchMyModels();
    }
  }, [user]);

  const fetchMyModels = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Fout bij ophalen modellen');
      console.error(error);
    } else {
      setModels(data || []);
    }
  };

  const handleDelete = async (modelId: string, filePath: string) => {
    if (!confirm('Weet je zeker dat je dit model wilt verwijderen?')) return;

    const { error: storageError } = await supabase.storage
      .from('models')
      .remove([filePath]);

    if (storageError) {
      toast.error('Fout bij verwijderen bestand');
      console.error(storageError);
      return;
    }

    const { error: dbError } = await supabase
      .from('models')
      .delete()
      .eq('id', modelId);

    if (dbError) {
      toast.error('Fout bij verwijderen model');
      console.error(dbError);
    } else {
      toast.success('Model verwijderd!');
      fetchMyModels();
      if (selectedModel?.id === modelId) {
        setSelectedModel(null);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Uitgelogd!');
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      
      <main className="min-h-screen pl-16 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Mijn Profiel</h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <Button onClick={handleLogout} variant="destructive" className="gap-2">
              <LogOut className="h-4 w-4" />
              Uitloggen
            </Button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Mijn Modellen ({models.length})
            </h2>
          </div>

          {selectedModel ? (
            <div className="space-y-4">
              <Button onClick={() => setSelectedModel(null)} variant="outline">
                ← Terug naar overzicht
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
                    <StandbeeldViewer 
                      onClose={() => setSelectedModel(null)} 
                      modelPath={selectedModel.file_path}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {models.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <p className="text-muted-foreground text-lg">
                    Je hebt nog geen modellen geüpload.
                  </p>
                  <Button onClick={() => navigate('/upload')} className="mt-4">
                    Upload je eerste model
                  </Button>
                </div>
              ) : (
                models.map((model) => (
                  <Card key={model.id} className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{model.name}</CardTitle>
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
                          <Button 
                            onClick={() => setSelectedModel(model)}
                            size="sm"
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Bekijk
                          </Button>
                          <Button 
                            onClick={() => handleDelete(model.id, model.file_path)}
                            size="sm"
                            variant="destructive"
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

export default Profile;
