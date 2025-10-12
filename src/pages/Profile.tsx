import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import StandbeeldViewer from '@/components/StandbeeldViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Eye, Trash2, LogOut, Settings, Moon, Sun } from 'lucide-react';
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

interface Profile {
  id: string;
  user_id: string;
  theme: 'light' | 'dark';
  language: 'nl' | 'en';
  created_at: string;
  updated_at: string;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
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
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      // Profile might not exist yet, create it with location detection
      await createProfileWithLocationDetection();
    } else {
      setProfile(data as Profile);
      applyTheme(data.theme as 'light' | 'dark');
    }
  };

  const createProfileWithLocationDetection = async () => {
    if (!user) return;

    try {
      // Detect user's country using geolocation
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Use reverse geocoding to detect country
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
      );
      const locationData = await response.json();
      const isNetherlands = locationData.address?.country_code === 'nl';
      const language = isNetherlands ? 'nl' : 'en';

      const { data, error } = await supabase
        .from('profiles')
        .insert({ user_id: user.id, theme: 'light', language })
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data as Profile);
      applyTheme(data.theme as 'light' | 'dark');
      toast.success(language === 'nl' ? 'Profiel aangemaakt!' : 'Profile created!');
    } catch (error) {
      console.error('Error creating profile:', error);
      // Fallback to English if location detection fails
      const { data } = await supabase
        .from('profiles')
        .insert({ user_id: user.id, theme: 'light', language: 'en' })
        .select()
        .single();
      
      if (data) {
        setProfile(data as Profile);
        applyTheme(data.theme as 'light' | 'dark');
      }
    }
  };

  const applyTheme = (theme: 'light' | 'dark') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      toast.error(profile.language === 'nl' ? 'Fout bij opslaan' : 'Error saving');
      console.error(error);
    } else {
      setProfile(data as Profile);
      if (updates.theme) applyTheme(updates.theme);
      toast.success(profile.language === 'nl' ? 'Instellingen opgeslagen!' : 'Settings saved!');
    }
  };

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

  const t = profile?.language === 'nl' ? {
    myProfile: 'Mijn Profiel',
    settings: 'Instellingen',
    myModels: 'Mijn Modellen',
    logout: 'Uitloggen',
    backToOverview: 'Terug naar overzicht',
    noModels: 'Je hebt nog geen modellen geüpload.',
    uploadFirst: 'Upload je eerste model',
    view: 'Bekijk',
    theme: 'Thema',
    light: 'Licht',
    dark: 'Donker',
    language: 'Taal',
    dutch: 'Nederlands',
    english: 'Engels',
    showSettings: 'Toon instellingen',
    hideSettings: 'Verberg instellingen',
  } : {
    myProfile: 'My Profile',
    settings: 'Settings',
    myModels: 'My Models',
    logout: 'Logout',
    backToOverview: 'Back to overview',
    noModels: 'You haven\'t uploaded any models yet.',
    uploadFirst: 'Upload your first model',
    view: 'View',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    dutch: 'Dutch',
    english: 'English',
    showSettings: 'Show settings',
    hideSettings: 'Hide settings',
  };

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      
      <main className="min-h-screen md:pl-16 p-4 md:p-8 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{t.myProfile}</h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowSettings(!showSettings)} 
                variant="outline" 
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                {showSettings ? t.hideSettings : t.showSettings}
              </Button>
              <Button onClick={handleLogout} variant="destructive" className="gap-2">
                <LogOut className="h-4 w-4" />
                {t.logout}
              </Button>
            </div>
          </div>

          {showSettings && profile && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t.settings}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="theme" className="flex items-center gap-2">
                    {profile.theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    {t.theme}
                  </Label>
                  <Select 
                    value={profile.theme} 
                    onValueChange={(value: 'light' | 'dark') => updateProfile({ theme: value })}
                  >
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{t.light}</SelectItem>
                      <SelectItem value="dark">{t.dark}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="language">{t.language}</Label>
                  <Select 
                    value={profile.language} 
                    onValueChange={(value: 'nl' | 'en') => updateProfile({ language: value })}
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nl">{t.dutch}</SelectItem>
                      <SelectItem value="en">{t.english}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
              {t.myModels} ({models.length})
            </h2>
          </div>

          {selectedModel ? (
            <div className="space-y-4">
              <Button onClick={() => setSelectedModel(null)} variant="outline">
                ← {t.backToOverview}
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
                    {t.noModels}
                  </p>
                  <Button onClick={() => navigate('/upload')} className="mt-4">
                    {t.uploadFirst}
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
                            {t.view}
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
