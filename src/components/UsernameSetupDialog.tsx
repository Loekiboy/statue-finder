import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface UsernameSetupDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const UsernameSetupDialog = ({ open, onClose, userId }: UsernameSetupDialogProps) => {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: t('Fout', 'Error'),
        description: t('Voer een gebruikersnaam in', 'Please enter a username'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: t('Gelukt!', 'Success!'),
        description: t('Je gebruikersnaam is ingesteld', 'Your username has been set'),
      });
      
      onClose();
    } catch (error: any) {
      const errorMessage = error.message?.includes('duplicate') || error.code === '23505'
        ? t('Deze gebruikersnaam is al in gebruik', 'This username is already taken')
        : t('Er is een fout opgetreden', 'An error occurred');
      
      toast({
        title: t('Fout', 'Error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Stel je gebruikersnaam in', 'Set your username')}</DialogTitle>
          <DialogDescription>
            {t('Kies een gebruikersnaam die wordt weergegeven op de klassementen', 'Choose a username that will be displayed on the leaderboards')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t('Gebruikersnaam', 'Username')}</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('Voer je gebruikersnaam in', 'Enter your username')}
              maxLength={30}
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Later', 'Later')}
            </Button>
            <Button type="submit" disabled={loading}>
              {t(loading ? 'Bezig...' : 'Opslaan', loading ? 'Saving...' : 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameSetupDialog;
