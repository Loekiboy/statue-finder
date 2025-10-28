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
}

const QuickUploadDialog = ({ open, onOpenChange, statueName, latitude, longitude }: QuickUploadDialogProps) => {
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
            {t('Kies wat je wilt uploaden voor dit standbeeld', 'Choose what you want to upload for this statue')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 py-4">
          <Button
            onClick={() => handleUploadChoice('photo')}
            className="w-full h-20 text-lg"
            variant="outline"
            disabled={isNavigating}
          >
            <ImageIcon className="mr-2 h-6 w-6" />
            {t('Foto Uploaden', 'Upload Photo')}
          </Button>
          
          <Button
            onClick={() => handleUploadChoice('model')}
            className="w-full h-20 text-lg"
            variant="outline"
            disabled={isNavigating}
          >
            <UploadIcon className="mr-2 h-6 w-6" />
            {t('3D Model Uploaden', 'Upload 3D Model')}
          </Button>
          
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
