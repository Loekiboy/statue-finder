import { useState, useEffect } from 'react';
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
import QRCode from 'qrcode';

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
  const [show2FA, setShow2FA] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email: validationResult.data.email,
          password: validationResult.data.password,
        });
        if (error) throw error;
        
        // Check if user has 2FA enabled
        const { data: factors } = await supabase.auth.mfa.listFactors();
        if (factors && factors.totp && factors.totp.length > 0) {
          // Create challenge for 2FA
          const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
            factorId: factors.totp[0].id
          });
          
          if (challengeError) throw challengeError;
          
          setShow2FA(true);
          setFactorId(factors.totp[0].id);
          setChallengeId(challengeData.id);
        } else {
          toast({ title: t('Welkom terug!', 'Welcome back!') });
          navigate('/');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: validationResult.data.email,
          password: validationResult.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        
        // Start 2FA enrollment after signup
        const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
        });
        
        if (enrollError) throw enrollError;
        
        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(enrollData.totp.qr_code);
        setQrCode(qrCodeDataUrl);
        setFactorId(enrollData.id);
        setShow2FA(true);
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
      setLoading(false);
    } finally {
      if (!show2FA) {
        setLoading(false);
      }
    }
  };

  const handleVerify2FA = async () => {
    if (totpCode.length !== 6) {
      toast({
        title: 'Fout',
        description: 'Voer een geldige 6-cijferige code in',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Verify for login
        const { error } = await supabase.auth.mfa.verify({
          factorId,
          challengeId,
          code: totpCode,
        });
        
        if (error) throw error;
        
        toast({ title: t('Welkom terug!', 'Welcome back!') });
        navigate('/');
      } else {
        // Verify for enrollment - create challenge first for enrollment verification
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId
        });
        
        if (challengeError) throw challengeError;
        
        const { error } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challengeData.id,
          code: totpCode,
        });
        
        if (error) throw error;
        
        toast({ 
          title: t('2FA ingeschakeld!', '2FA enabled!'), 
          description: t('Je account is nu beveiligd', 'Your account is now secured') 
        });
        navigate('/');
      }
    } catch (error: any) {
      toast({
        title: 'Fout',
        description: 'Ongeldige code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (show2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('Twee-factor authenticatie', 'Two-Factor Authentication')}</CardTitle>
            <CardDescription>
              {isLogin 
                ? t('Voer de code uit je authenticator app in', 'Enter the code from your authenticator app')
                : t('Scan de QR code met je authenticator app', 'Scan the QR code with your authenticator app')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isLogin && qrCode && (
              <div className="flex flex-col items-center gap-4">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                <p className="text-sm text-muted-foreground text-center">
                  {t('Scan deze QR code met Google Authenticator, Authy, of een andere authenticator app', 'Scan this QR code with Google Authenticator, Authy, or another authenticator app')}
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <Label htmlFor="totp">{t('Verificatiecode', 'Verification code')}</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={totpCode}
                  onChange={(value) => setTotpCode(value)}
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
              onClick={handleVerify2FA} 
              className="w-full" 
              disabled={loading || totpCode.length !== 6}
            >
              {t(loading ? 'Bezig...' : 'Verifiëren', loading ? 'Loading...' : 'Verify')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setShow2FA(false);
                setTotpCode('');
                setQrCode('');
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
