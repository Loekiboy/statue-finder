import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload as UploadIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface QuickUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statueName: string;
  latitude: number;
  longitude: number;
  isStreetArt?: boolean;
  hasPhotos?: boolean;
}

const QuickUploadDialog = ({ open, onOpenChange, statueName, latitude, longitude, isStreetArt = false, hasPhotos = false }: QuickUploadDialogProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleUploadChoice = (type: 'photo' | 'model') => {
    setIsNavigating(true);
    
    // Store location data in localStorage for the Upload page to pick up
    localStorage.setItem('uploadLocation', JSON.stringify({
      lat: latitude,
      lon: longitude,
      name: statueName
    }));
    
    // Store upload type preference
    localStorage.setItem('uploadType', type);
    
    // Navigate to upload page
    navigate('/upload');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[10000]">
        <DialogHeader>
          <DialogTitle>{t('Uploaderen voor', 'Upload for')} {statueName}</DialogTitle>
          <DialogDescription>
            {isStreetArt 
              ? hasPhotos 
                ? t('Voor street art kunnen alleen foto\'s worden geüpload', 'For street art only photos can be uploaded')
                : t('Voor street art zonder foto\'s kun je een foto uploaden', 'For street art without photos you can upload a photo')
              : t('Kies wat je wilt uploaden voor dit standbeeld', 'Choose what you want to upload for this statue')
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 py-4">
          {/* Show photo upload if not street art OR if street art without photos */}
          {(!isStreetArt || !hasPhotos) && (
            <Button
              onClick={() => handleUploadChoice('photo')}
              className="w-full h-20 text-lg"
              variant="outline"
              disabled={isNavigating}
            >
              <ImageIcon className="mr-2 h-6 w-6" />
              {t('Foto Uploaden', 'Upload Photo')}
            </Button>
          )}
          
          {/* Only show model upload if NOT street art */}
          {!isStreetArt && (
            <Button
              onClick={() => handleUploadChoice('model')}
              className="w-full h-20 text-lg"
              variant="outline"
              disabled={isNavigating}
            >
              <UploadIcon className="mr-2 h-6 w-6" />
              {t('3D Model Uploaden', 'Upload 3D Model')}
            </Button>
          )}
          
          {/* Show message if street art with photos (no uploads allowed) */}
          {isStreetArt && hasPhotos && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t('Voor deze street art met foto\'s kunnen geen uploads worden toegevoegd', 'No uploads can be added for this street art with photos')}
              </p>
            </div>
          )}
          
          {isNavigating && (
            <p className="text-sm text-muted-foreground text-center">
              {t('Navigeren naar upload pagina...', 'Navigating to upload page...')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickUploadDialog;
