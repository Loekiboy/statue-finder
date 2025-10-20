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
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      toast({
        title: t('Fout', 'Error'),
        description: t('Voer de verificatiecode in', 'Please enter the verification code'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'signup',
      });
      
      if (error) throw error;
      
      toast({ 
        title: t('Account geverifieerd!', 'Account verified!'), 
        description: t('Je kunt nu inloggen', 'You can now login') 
      });
      setVerificationStep(false);
      setIsLogin(true);
      setEmail('');
      setPassword('');
      setVerificationCode('');
    } catch (error: any) {
      const safeMessage = error.message?.includes('invalid')
        ? t('Ongeldige verificatiecode', 'Invalid verification code')
        : t('Er is een fout opgetreden', 'An error occurred');
      
      toast({
        title: t('Fout', 'Error'),
        description: safeMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
        const { error } = await supabase.auth.signInWithPassword({
          email: validationResult.data.email,
          password: validationResult.data.password,
        });
        if (error) throw error;
        toast({ title: t('Welkom terug!', 'Welcome back!') });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email: validationResult.data.email,
          password: validationResult.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        
        toast({ 
          title: t('Verificatie email verzonden!', 'Verification email sent!'), 
          description: t('Controleer je email en voer de verificatiecode in', 'Check your email and enter the verification code') 
        });
        setVerificationStep(true);
      }
    } catch (error: any) {
      const safeMessage = error.code === 'invalid_credentials'
        ? 'Onjuiste inloggegevens'
        : 'Er is een fout opgetreden';
      
      toast({
        title: 'Fout',
        description: safeMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
          {verificationStep ? (
            <form onSubmit={handleVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">{t('Verificatiecode', 'Verification Code')}</Label>
                <Input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder={t('Voer de code uit je email in', 'Enter the code from your email')}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {t(loading ? 'Bezig...' : 'Verifiëren', loading ? 'Verifying...' : 'Verify')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setVerificationStep(false);
                  setVerificationCode('');
                }}
              >
                {t('Terug', 'Back')}
              </Button>
            </form>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
