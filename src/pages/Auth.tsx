import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { z } from 'zod';
import { Mail, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

const emailSchema = z.string().trim().email().max(255);

const Auth = () => {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState('');
  const { toast } = useToast();

  const isEmail = (input: string) => {
    return emailSchema.safeParse(input).success;
  };

  // Look up email by username from profiles table
  const lookupEmailByUsername = async (username: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', username.trim())
        .single();

      if (error || !data || !data.email) {
        return null;
      }

      return data.email;
    } catch {
      return null;
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      toast({
        title: t('Vul je e-mail of username in', 'Enter your email or username'),
        description: t('Dit veld is verplicht', 'This field is required'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let emailToUse: string;

      if (isEmail(identifier)) {
        emailToUse = identifier.trim().toLowerCase();
      } else {
        // Try to find email by username
        const foundEmail = await lookupEmailByUsername(identifier);
        if (!foundEmail) {
          toast({
            title: t('Gebruiker niet gevonden', 'User not found'),
            description: t(
              'Geen account gevonden met deze username. Gebruik je e-mailadres om in te loggen.',
              'No account found with this username. Use your email address to log in.'
            ),
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        emailToUse = foundEmail;
      }

      // Send magic link (user clicks link in email, no code needed)
      const { error } = await supabase.auth.signInWithOtp({
        email: emailToUse,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      setSentToEmail(emailToUse);
      setEmailSent(true);
      toast({
        title: t('E-mail verzonden! ✉️', 'Email sent! ✉️'),
        description: t(
          'Klik op de link in je e-mail om in te loggen',
          'Click the link in your email to log in'
        ),
      });
    } catch (error: any) {
      toast({
        title: t('Fout', 'Error'),
        description: error.message || t('Er is een fout opgetreden', 'An error occurred'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: sentToEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast({
        title: t('Nieuwe e-mail verzonden! ✉️', 'New email sent! ✉️'),
        description: t('Check je inbox', 'Check your inbox'),
      });
    } catch (error: any) {
      toast({
        title: t('Fout', 'Error'),
        description: error.message || t('Kon geen nieuwe e-mail verzenden', 'Could not send new email'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('Check je e-mail!', 'Check your email!')}</CardTitle>
            <CardDescription className="text-base">
              {t('We hebben een link gestuurd', "We've sent you a link")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {t('Verzonden naar', 'Sent to')}
              </p>
              <p className="font-medium text-foreground">{sentToEmail}</p>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-4">
              <p className="text-sm text-center text-foreground">
                {t(
                  'Klik op de knop in de e-mail om direct in te loggen. Geen code nodig!',
                  'Click the button in the email to log in instantly. No code needed!'
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('Versturen...', 'Sending...')}
                  </>
                ) : (
                  t('Verstuur opnieuw', 'Resend email')
                )}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setEmailSent(false);
                  setIdentifier('');
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('Ander e-mailadres gebruiken', 'Use different email')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('Inloggen', 'Login')}</CardTitle>
          <CardDescription className="text-base">
            {t(
              'Geen wachtwoord nodig! We sturen je een link.',
              "No password needed! We'll send you a link."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendMagicLink} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-base">
                {t('E-mail of username', 'Email or username')}
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder={t('jouw@email.nl of username', 'your@email.com or username')}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 text-base"
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  'Je ontvangt een link om direct in te loggen',
                  "You'll receive a link to log in instantly"
                )}
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('Versturen...', 'Sending...')}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('Verstuur login link', 'Send login link')}
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t(
                'Geen account? Je wordt automatisch geregistreerd.',
                "No account? You'll be registered automatically."
              )}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
