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

const authSchema = z.object({
  email: z.string().trim().email('Ongeldig e-mailadres').max(255),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn').max(72),
});

const Auth = () => {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validationResult = authSchema.safeParse({ email, password });
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || 'Ongeldige invoer';
      toast({
        title: 'Validatiefout',
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Verify password first
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: validationResult.data.email,
          password: validationResult.data.password,
        });

        if (signInError) throw signInError;

        // Successfully logged in
        toast({
          title: t('Succesvol ingelogd!', 'Successfully logged in!'),
          description: t('Welkom terug', 'Welcome back'),
        });
        navigate('/');
      } else {
        // For signup, create account with auto-confirm enabled
        const { error: signUpError, data } = await supabase.auth.signUp({
          email: validationResult.data.email,
          password: validationResult.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (signUpError) throw signUpError;

        // Check if email confirmation is required
        if (data.user && !data.session) {
          // Email confirmation required
          setUserEmail(validationResult.data.email);
          setShowEmailOTP(true);
          toast({
            title: t('Account aangemaakt!', 'Account created!'),
            description: t('Check je e-mail voor de 6-cijferige verificatiecode', 'Check your email for the 6-digit verification code'),
          });
        } else {
          // Auto-confirmed, redirect to home
          toast({
            title: t('Account aangemaakt!', 'Account created!'),
            description: t('Je bent nu ingelogd', 'You are now logged in'),
          });
          navigate('/');
        }
      }
    } catch (error: any) {
      const safeMessage = error.code === 'invalid_credentials'
        ? 'Onjuiste inloggegevens'
        : error.message || 'Er is een fout opgetreden';
      
      toast({
        title: 'Fout',
        description: safeMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: 'Fout',
        description: t('Voer een geldige 6-cijferige code in', 'Enter a valid 6-digit code'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: userEmail,
        token: otpCode,
        type: 'email',
      });

      if (error) throw error;

      toast({
        title: t('Succes!', 'Success!'),
        description: t('Je bent geverifieerd en ingelogd', 'You are verified and logged in'),
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Fout',
        description: t('Ongeldige code', 'Invalid code'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (showEmailOTP) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('E-mail verificatie', 'Email Verification')}</CardTitle>
            <CardDescription>
              {t('Voer de 6-cijferige code in die naar je e-mail is gestuurd', 'Enter the 6-digit code sent to your email')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground text-center">
              {t('Code verzonden naar', 'Code sent to')} <strong>{userEmail}</strong>
            </p>
            
            <div className="space-y-4">
              <Label htmlFor="otp">{t('Verificatiecode', 'Verification code')}</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(value) => setOtpCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button 
              onClick={handleVerifyOTP} 
              className="w-full" 
              disabled={loading || otpCode.length !== 6}
            >
              {t(loading ? 'Bezig...' : 'Verifiëren', loading ? 'Loading...' : 'Verify')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setShowEmailOTP(false);
                setOtpCode('');
                setLoading(false);
              }}
            >
              {t('Terug', 'Back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t(isLogin ? 'Inloggen' : 'Registreren', isLogin ? 'Login' : 'Register')}</CardTitle>
          <CardDescription>
            {t(isLogin ? 'Log in om 3D modellen te uploaden' : 'Maak een account aan', isLogin ? 'Login to upload 3D models' : 'Create an account')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('Wachtwoord', 'Password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {t(loading ? 'Bezig...' : isLogin ? 'Inloggen' : 'Registreren', loading ? 'Loading...' : isLogin ? 'Login' : 'Register')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsLogin(!isLogin)}
              >
                {t(isLogin ? 'Nog geen account? Registreer' : 'Heb je al een account? Log in', isLogin ? "Don't have an account? Register" : 'Already have an account? Login')}
              </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
