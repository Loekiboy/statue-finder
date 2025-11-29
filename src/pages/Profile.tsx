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
import { Eye, Trash2, LogOut, Settings, Moon, Sun, MapPin, User as UserIcon, Smartphone, Share, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  show_osm_statues: boolean;
  slideshow_enabled: boolean;
  username?: string;
  created_at: string;
  updated_at: string;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
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
    // Apply saved theme immediately on mount
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      applyTheme(savedTheme);
    }

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
      localStorage.setItem('language', data.language);
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
        .insert({ user_id: user.id, theme: 'light', language, show_osm_statues: true })
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
        .insert({ user_id: user.id, theme: 'light', language: 'en', show_osm_statues: true })
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
    localStorage.setItem('theme', theme);
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
      if (updates.language) localStorage.setItem('language', updates.language);
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
    showOsmStatues: 'Toon standbeelden zonder model',
    showOsmStatuesDesc: 'Toon standbeelden van OpenStreetMap op de kaart die nog geen 3D model hebben',
    username: 'Gebruikersnaam',
    usernameDesc: 'Deze naam wordt getoond in de leaderboards',
    usernamePlaceholder: 'Voer je gebruikersnaam in',
    slideshowEnabled: 'Automatische slideshow',
    slideshowEnabledDesc: 'Start automatisch een slideshow bij foto\'s van kunstwerken',
    installApp: 'Installeer als App',
    installAppDesc: 'Voeg Statue Finder toe aan je startscherm voor de beste ervaring',
    installInstructions: 'Installatie instructies',
    step1Title: 'Open in Safari',
    step1Desc: 'Zorg dat je deze website opent in Safari (niet Chrome of een andere browser)',
    step2Title: 'Tik op het Deel-icoon',
    step2Desc: 'Tik onderaan het scherm op het vierkant met de pijl omhoog',
    step3Title: 'Scroll naar beneden',
    step3Desc: 'Scroll in het menu naar beneden tot je "Zet op beginscherm" ziet',
    step4Title: 'Tik op "Zet op beginscherm"',
    step4Desc: 'Tik op de optie met het plus-icoon',
    step5Title: 'Bevestig',
    step5Desc: 'Tik rechtsboven op "Voeg toe" om de app te installeren',
    done: 'Klaar! De app staat nu op je startscherm en werkt als een echte app.',
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
    showOsmStatues: 'Show statues without model',
    showOsmStatuesDesc: 'Show OpenStreetMap statues on the map that don\'t have a 3D model yet',
    username: 'Username',
    usernameDesc: 'This name will be shown in the leaderboards',
    usernamePlaceholder: 'Enter your username',
    slideshowEnabled: 'Automatic slideshow',
    slideshowEnabledDesc: 'Automatically start a slideshow when viewing artwork photos',
    installApp: 'Install as App',
    installAppDesc: 'Add Statue Finder to your home screen for the best experience',
    installInstructions: 'Installation instructions',
    step1Title: 'Open in Safari',
    step1Desc: 'Make sure you open this website in Safari (not Chrome or another browser)',
    step2Title: 'Tap the Share icon',
    step2Desc: 'Tap the square with the arrow pointing up at the bottom of the screen',
    step3Title: 'Scroll down',
    step3Desc: 'Scroll down in the menu until you see "Add to Home Screen"',
    step4Title: 'Tap "Add to Home Screen"',
    step4Desc: 'Tap the option with the plus icon',
    step5Title: 'Confirm',
    step5Desc: 'Tap "Add" in the top right corner to install the app',
    done: 'Done! The app is now on your home screen and works like a real app.',
  };

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      
      <main className="min-h-screen md:pl-20 lg:pl-24 p-6 md:p-12 pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{t.myProfile}</h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={() => navigate('/upload')} 
                variant="default" 
                className="gap-2"
              >
                {profile?.language === 'nl' ? 'Upload Model' : 'Upload Model'}
              </Button>
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
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    {t.username}
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder={t.usernamePlaceholder}
                    value={profile.username || ''}
                    onChange={(e) => updateProfile({ username: e.target.value })}
                    maxLength={20}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t.usernameDesc}
                  </p>
                </div>

                <Separator />

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

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-osm" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {t.showOsmStatues}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t.showOsmStatuesDesc}
                      </p>
                    </div>
                    <Switch
                      id="show-osm"
                      checked={profile.show_osm_statues ?? true}
                      onCheckedChange={(checked) => updateProfile({ show_osm_statues: checked })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="slideshow" className="flex items-center gap-2">
                        {t.slideshowEnabled}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t.slideshowEnabledDesc}
                      </p>
                    </div>
                    <Switch
                      id="slideshow"
                      checked={profile.slideshow_enabled ?? true}
                      onCheckedChange={(checked) => updateProfile({ slideshow_enabled: checked })}
                    />
                  </div>
                </div>

                <Separator />

                {/* iOS Install Instructions */}
                <div className="space-y-3">
                  <button
                    onClick={() => setShowInstallInstructions(!showInstallInstructions)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/20">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">{t.installApp}</p>
                        <p className="text-sm text-muted-foreground">{t.installAppDesc}</p>
                      </div>
                    </div>
                    {showInstallInstructions ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  {showInstallInstructions && (
                    <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <span className="text-lg">📱</span> {t.installInstructions} (iOS)
                      </h4>
                      
                      <div className="space-y-4">
                        {/* Step 1 */}
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                            1
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{t.step1Title}</p>
                            <p className="text-sm text-muted-foreground">{t.step1Desc}</p>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                            2
                          </div>
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-2">
                              {t.step2Title}
                              <Share className="h-4 w-4 text-primary" />
                            </p>
                            <p className="text-sm text-muted-foreground">{t.step2Desc}</p>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                            3
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{t.step3Title}</p>
                            <p className="text-sm text-muted-foreground">{t.step3Desc}</p>
                          </div>
                        </div>

                        {/* Step 4 */}
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                            4
                          </div>
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-2">
                              {t.step4Title}
                              <Plus className="h-4 w-4 text-primary" />
                            </p>
                            <p className="text-sm text-muted-foreground">{t.step4Desc}</p>
                          </div>
                        </div>

                        {/* Step 5 */}
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                            5
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{t.step5Title}</p>
                            <p className="text-sm text-muted-foreground">{t.step5Desc}</p>
                          </div>
                        </div>
                      </div>

                      {/* Success message */}
                      <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                          <span className="text-lg">✅</span> {t.done}
                        </p>
                      </div>
                    </div>
                  )}
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
