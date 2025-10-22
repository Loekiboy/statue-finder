import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { NijmegenKunstwerk } from '@/data/nijmegenKunstwerken';
import { UtrechtKunstwerk } from '@/data/utrechtKunstwerken';
import { useState } from 'react';

interface KunstwerkViewerProps {
  kunstwerk: NijmegenKunstwerk | UtrechtKunstwerk | null;
  city: 'nijmegen' | 'utrecht';
  onClose: () => void;
}

const KunstwerkViewer = ({ kunstwerk, city, onClose }: KunstwerkViewerProps) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  if (!kunstwerk) return null;

  const photos: string[] = [];
  
  // Only show photos for Utrecht (Nijmegen photos don't work)
  if (city === 'utrecht') {
    const utrechtKunstwerk = kunstwerk as UtrechtKunstwerk;
    photos.push(...utrechtKunstwerk.photos);
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
    : (kunstwerk as NijmegenKunstwerk).description || '';
  const websiteUrl = city === 'nijmegen' ? (kunstwerk as NijmegenKunstwerk).websiteUrl : null;
  const credits = city === 'nijmegen' ? (kunstwerk as NijmegenKunstwerk).credits : null;

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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KunstwerkViewer;
