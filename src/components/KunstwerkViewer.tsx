import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ExternalLink, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { NijmegenKunstwerk } from '@/data/nijmegenKunstwerken';
import { UtrechtKunstwerk } from '@/data/utrechtKunstwerken';
import { AmsterdamKunstwerk } from '@/data/amsterdamKunstwerken';
import { useState } from 'react';
import QuickUploadDialog from './QuickUploadDialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface KunstwerkViewerProps {
  kunstwerk: NijmegenKunstwerk | UtrechtKunstwerk | AmsterdamKunstwerk | null;
  city: 'nijmegen' | 'utrecht' | 'amsterdam';
  onClose: () => void;
}

const KunstwerkViewer = ({ kunstwerk, city, onClose }: KunstwerkViewerProps) => {
  const { t } = useLanguage();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  if (!kunstwerk) return null;

  const photos: string[] = [];
  
  // Show photos for Utrecht and Amsterdam
  if (city === 'utrecht') {
    const utrechtKunstwerk = kunstwerk as UtrechtKunstwerk;
    photos.push(...utrechtKunstwerk.photos);
  } else if (city === 'amsterdam') {
    const amsterdamKunstwerk = kunstwerk as AmsterdamKunstwerk;
    if (amsterdamKunstwerk.photoUrl) {
      photos.push(amsterdamKunstwerk.photoUrl);
    }
  }

  const hasPhotos = photos.length > 0;
  const currentPhoto = hasPhotos ? photos[currentPhotoIndex] : null;
  
  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };
  
  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };
  
  const description = city === 'utrecht' 
    ? (kunstwerk as UtrechtKunstwerk).description 
    : city === 'amsterdam'
    ? (kunstwerk as AmsterdamKunstwerk).description || ''
    : (kunstwerk as NijmegenKunstwerk).description || '';
  
  const websiteUrl = city === 'nijmegen' 
    ? (kunstwerk as NijmegenKunstwerk).websiteUrl 
    : city === 'amsterdam'
    ? (kunstwerk as AmsterdamKunstwerk).websiteUrl
    : null;
    
  const credits = city === 'nijmegen' ? (kunstwerk as NijmegenKunstwerk).credits : null;
  const year = city === 'amsterdam' ? (kunstwerk as AmsterdamKunstwerk).year : null;

  return (
    <Dialog open={!!kunstwerk} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{kunstwerk.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {hasPhotos && currentPhoto && (
            <div className="relative w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '300px' }}>
              <img 
                src={currentPhoto} 
                alt={kunstwerk.name}
                className="max-w-full max-h-[500px] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Kunstenaar</h3>
              <p className="text-base">{kunstwerk.artist}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Locatie</h3>
              <p className="text-base">{kunstwerk.location}</p>
            </div>
            
            {description && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Beschrijving</h3>
                <div 
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              </div>
            )}
            
            {credits && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Eigendom van</h3>
                <p className="text-base">{credits}</p>
              </div>
            )}
            
            {year && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Jaar</h3>
                <p className="text-base">{year}</p>
              </div>
            )}
            
            {websiteUrl && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(websiteUrl!, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Meer informatie
                </Button>
              </div>
            )}
            
            <div className="pt-2 flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowUploadDialog(true)}
                className="gap-2 flex-1"
              >
                <Upload className="w-4 h-4" />
                {t('Upload foto/model', 'Upload photo/model')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
      
      <QuickUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        statueName={kunstwerk.name}
        latitude={kunstwerk.lat}
        longitude={kunstwerk.lon}
      />
    </Dialog>
  );
};

export default KunstwerkViewer;
