import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { z } from 'zod';
import { Mail, Loader2, CheckCircle, ArrowLeft, Chrome } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const emailSchema = z.string().trim().email().max(255);

const Auth = () => {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: t('Fout', 'Error'),
        description: error.message || t('Google login mislukt', 'Google login failed'),
        variant: 'destructive',
      });
      setGoogleLoading(false);
    }
  };

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
              disabled={loading || googleLoading}
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t('of', 'or')}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {t('Doorgaan met Google', 'Continue with Google')}
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
