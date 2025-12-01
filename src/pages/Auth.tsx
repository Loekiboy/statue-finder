import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Mail, Loader2, ArrowLeft, Sparkles } from 'lucide-react';

const emailSchema = z.string().trim().email().max(255);

const Auth = () => {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState(''); // Can be email or username
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if the input is an email or username
  const isEmail = (input: string) => {
    return emailSchema.safeParse(input).success;
  };

  // Look up email by username
  const lookupEmailByUsername = async (username: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', username.toLowerCase())
        .single();

      if (error || !data) {
        return null;
      }

      // Get the user's email from auth (we need to use a different approach)
      // Since we can't directly access auth.users, we'll need to store email in profiles
      // For now, we'll return null and show an error
      return null;
    } catch {
      return null;
    }
  };

  // Look up email by username from a stored email field or use alternative approach
  const resolveEmail = async (input: string): Promise<string | null> => {
    if (isEmail(input)) {
      return input.trim().toLowerCase();
    }

    // Try to find user by username - check if there's a profile with this username
    // and get associated email (we'll need to add email to profiles or use another method)
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('username', input.trim())
      .single();

    if (error || !data) {
      return null;
    }

    // We found a user with this username, but we need their email
    // Since we can't access auth.users directly, we'll show an error for username login
    // unless we store email in profiles table
    toast({
      title: t('Gebruik je e-mailadres', 'Use your email address'),
      description: t(
        'Log in met je e-mailadres. Username login wordt binnenkort toegevoegd.',
        'Log in with your email address. Username login coming soon.'
      ),
      variant: 'destructive',
    });
    return null;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      toast({
        title: t('Vul je e-mail in', 'Enter your email'),
        description: t('E-mailadres is verplicht', 'Email address is required'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Check if it's an email
      if (!isEmail(identifier)) {
        // Try username lookup
        const email = await resolveEmail(identifier);
        if (!email) {
          setLoading(false);
          return; // Error already shown in resolveEmail
        }
        setResolvedEmail(email);
      } else {
        setResolvedEmail(identifier.trim().toLowerCase());
      }

      const emailToUse = isEmail(identifier) ? identifier.trim().toLowerCase() : resolvedEmail;

      // Send magic link OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: emailToUse,
        options: {
          shouldCreateUser: true, // Allow new users to sign up
        },
      });

      if (error) throw error;

      setResolvedEmail(emailToUse);
      setShowOTP(true);
      toast({
        title: t('Code verzonden! ✉️', 'Code sent! ✉️'),
        description: t(
          'Check je e-mail voor de verificatiecode',
          'Check your email for the verification code'
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

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: t('Fout', 'Error'),
        description: t('Voer een geldige 6-cijferige code in', 'Enter a valid 6-digit code'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: resolvedEmail,
        token: otpCode,
        type: 'email',
      });

      if (error) throw error;

      toast({
        title: t('Welkom! 🎉', 'Welcome! 🎉'),
        description: t('Je bent succesvol ingelogd', 'You are successfully logged in'),
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: t('Fout', 'Error'),
        description: t('Ongeldige of verlopen code', 'Invalid or expired code'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: resolvedEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      toast({
        title: t('Nieuwe code verzonden! ✉️', 'New code sent! ✉️'),
        description: t('Check je e-mail', 'Check your email'),
      });
    } catch (error: any) {
      toast({
        title: t('Fout', 'Error'),
        description: error.message || t('Kon geen nieuwe code verzenden', 'Could not send new code'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (showOTP) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('Verificatiecode', 'Verification Code')}</CardTitle>
            <CardDescription className="text-base">
              {t('Voer de 6-cijferige code in', 'Enter the 6-digit code')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">
                {t('Verzonden naar', 'Sent to')}
              </p>
              <p className="font-medium text-foreground">{resolvedEmail}</p>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="otp" className="text-center block">
                {t('Verificatiecode', 'Verification code')}
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(value) => setOtpCode(value)}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={1} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={2} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={3} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={4} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={5} className="w-12 h-14 text-lg" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button 
              onClick={handleVerifyOTP} 
              className="w-full h-12 text-base font-medium" 
              disabled={loading || otpCode.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('Bezig...', 'Loading...')}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('Verifiëren & Inloggen', 'Verify & Login')}
                </>
              )}
            </Button>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleResendCode}
                disabled={loading}
              >
                {t('Nieuwe code versturen', 'Resend code')}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setShowOTP(false);
                  setOtpCode('');
                  setLoading(false);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('Terug', 'Back')}
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
              'Geen wachtwoord nodig! We sturen je een code.',
              "No password needed! We'll send you a code."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-base">
                {t('E-mailadres', 'Email address')}
              </Label>
              <Input
                id="identifier"
                type="email"
                placeholder={t('jouw@email.nl', 'your@email.com')}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 text-base"
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  'Je ontvangt een verificatiecode op dit adres',
                  "You'll receive a verification code at this address"
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
                  {t('Code versturen...', 'Sending code...')}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('Verstuur verificatiecode', 'Send verification code')}
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
