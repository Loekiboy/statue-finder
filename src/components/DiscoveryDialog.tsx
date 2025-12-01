import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Image, X, Sparkles, Trophy, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Confetti from 'react-confetti';
import { compressImage } from '@/lib/imageUtils';
import { checkAndUnlockAchievements } from '@/lib/achievementTracker';

interface DiscoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kunstwerkName: string;
  kunstwerkId: string;
  city: string;
  hasExistingPhoto: boolean;
  onPhotoUploaded?: (photoUrl: string) => void;
}

const DiscoveryDialog = ({
  open,
  onOpenChange,
  kunstwerkName,
  kunstwerkId,
  city,
  hasExistingPhoto,
  onPhotoUploaded
}: DiscoveryDialogProps) => {
  const { t } = useLanguage();
  const [showConfetti, setShowConfetti] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'sparkle' | 'trophy' | 'message' | 'upload'>('sparkle');

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      setAnimationPhase('sparkle');
      
      // Animation sequence
      const timer1 = setTimeout(() => setAnimationPhase('trophy'), 500);
      const timer2 = setTimeout(() => setAnimationPhase('message'), 1200);
      const timer3 = setTimeout(() => {
        if (!hasExistingPhoto) {
          setAnimationPhase('upload');
          setShowUploadOptions(true);
        }
      }, 2500);
      const timer4 = setTimeout(() => setShowConfetti(false), 4000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [open, hasExistingPhoto]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('Je moet ingelogd zijn om een foto te uploaden', 'You must be logged in to upload a photo'));
        setIsUploading(false);
        return;
      }

      // Compress the image
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8
      });

      // Upload to storage
      const fileName = `${user.id}/${city}/${kunstwerkId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('kunstwerk-photos')
        .upload(fileName, compressedFile, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        // If bucket doesn't exist, create it first or inform user
        if (uploadError.message.includes('not found')) {
          toast.error(t('Foto opslag niet beschikbaar', 'Photo storage not available'));
        } else {
          throw uploadError;
        }
        setIsUploading(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('kunstwerk-photos')
        .getPublicUrl(fileName);

      // Update the discovery record with the photo URL
      await supabase
        .from('discovered_kunstwerken')
        .update({ photo_url: publicUrl })
        .eq('user_id', user.id)
        .eq('kunstwerk_id', kunstwerkId)
        .eq('city', city);

      toast.success(t('Foto geüpload!', 'Photo uploaded!'));
      onPhotoUploaded?.(publicUrl);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('Upload mislukt', 'Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileSelect(file);
    };
    input.click();
  };

  const handleGallerySelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileSelect(file);
    };
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[10001] overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[10002]">
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={200}
              gravity={0.3}
              colors={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']}
            />
          </div>
        )}
        
        <div className="relative py-6 px-4 text-center">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Animation container */}
          <div className="flex flex-col items-center gap-4">
            {/* Animated icon */}
            <div className={`relative transition-all duration-500 ${
              animationPhase === 'sparkle' ? 'scale-150 animate-pulse' :
              animationPhase === 'trophy' ? 'scale-125' : 'scale-100'
            }`}>
              {animationPhase === 'sparkle' && (
                <div className="relative">
                  <Sparkles className="w-20 h-20 text-yellow-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full animate-ping" />
                  </div>
                </div>
              )}
              {animationPhase !== 'sparkle' && (
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 animate-bounce">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md">
                    ✓
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            <div className={`transition-all duration-500 ${
              animationPhase === 'message' || animationPhase === 'upload' 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-4'
            }`}>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t('Gevonden!', 'Found!')} 🎉
              </h2>
              <p className="text-lg text-muted-foreground mb-1">
                {t('Je hebt ontdekt:', 'You discovered:')}
              </p>
              <p className="text-xl font-semibold text-primary">
                {kunstwerkName}
              </p>
            </div>

            {/* Upload options */}
            {showUploadOptions && !hasExistingPhoto && (
              <div className={`w-full space-y-4 mt-4 transition-all duration-500 ${
                animationPhase === 'upload' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <Upload className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {t('Wil je een foto toevoegen?', 'Want to add a photo?')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-16 flex-col gap-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={handleCameraCapture}
                      disabled={isUploading}
                    >
                      <Camera className="w-6 h-6" />
                      <span className="text-xs">{t('Camera', 'Camera')}</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex-col gap-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={handleGallerySelect}
                      disabled={isUploading}
                    >
                      <Image className="w-6 h-6" />
                      <span className="text-xs">{t('Galerij', 'Gallery')}</span>
                    </Button>
                  </div>
                  
                  {isUploading && (
                    <p className="text-sm text-muted-foreground text-center mt-3 animate-pulse">
                      {t('Uploaden...', 'Uploading...')}
                    </p>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  {t('Later toevoegen', 'Add later')}
                </Button>
              </div>
            )}

            {/* Close button for artworks with photos */}
            {hasExistingPhoto && animationPhase === 'message' && (
              <Button
                className="mt-4"
                onClick={() => onOpenChange(false)}
              >
                {t('Geweldig!', 'Awesome!')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiscoveryDialog;