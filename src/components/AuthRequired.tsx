import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Trophy, Upload, Map, Eye, Users, Camera } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface AuthRequiredProps {
  title: string;
  description: string;
}

const AuthRequired = ({ title, description }: AuthRequiredProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const features = [
    {
      icon: Trophy,
      title: t('Verzamel kunstwerken', 'Collect artworks'),
      description: t('Ontdek en verzamel kunstwerken bij jou in de buurt', 'Discover and collect artworks near you'),
    },
    {
      icon: Upload,
      title: t('Upload foto\'s & 3D modellen', 'Upload photos & 3D models'),
      description: t('Deel jouw foto\'s en 3D scans met de community', 'Share your photos and 3D scans with the community'),
    },
    {
      icon: Eye,
      title: t('Bekijk leaderboards', 'View leaderboards'),
      description: t('Zie wie de meeste kunstwerken heeft ontdekt', 'See who discovered the most artworks'),
    },
    {
      icon: Map,
      title: t('Bewaar je locatie', 'Save your location'),
      description: t('Je locatie wordt onthouden voor de volgende keer', 'Your location is remembered for next time'),
    },
  ];

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      
      <main className="min-h-screen md:pl-24 p-6 md:p-12 pb-24 md:pb-12">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-dashed border-muted-foreground/20">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="text-base">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 space-y-3">
                <Button 
                  onClick={() => navigate('/auth')} 
                  className="w-full h-12 text-base font-medium"
                >
                  {t('Nu aanmelden / Account maken', 'Sign up / Create account')}
                </Button>
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  className="w-full"
                >
                  {t('Terug naar de kaart', 'Back to map')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AuthRequired;
