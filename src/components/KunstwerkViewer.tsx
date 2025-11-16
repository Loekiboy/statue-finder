import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ExternalLink, ChevronLeft, ChevronRight, Upload, Box } from 'lucide-react';
import { NijmegenKunstwerk } from '@/data/nijmegenKunstwerken';
import { UtrechtKunstwerk } from '@/data/utrechtKunstwerken';
import { AlkmaarKunstwerk } from '@/data/alkmaartKunstwerken';
import { DenHaagKunstwerk } from '@/data/denhaagKunstwerken';
import { useState } from 'react';
import QuickUploadDialog from './QuickUploadDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import StandbeeldViewer from './StandbeeldViewer';
import PhotoViewer from './PhotoViewer';

interface Model {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  photo_url: string | null;
}

interface KunstwerkViewerProps {
  kunstwerk: NijmegenKunstwerk | UtrechtKunstwerk | AlkmaarKunstwerk | DenHaagKunstwerk | any | null;
  city: 'nijmegen' | 'utrecht' | 'alkmaar' | 'denhaag' | 'drenthe';
  model?: Model;
  onClose: () => void;
}

const KunstwerkViewer = ({ kunstwerk, city, model, onClose }: KunstwerkViewerProps) => {
  const { t } = useLanguage();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  
  if (!kunstwerk) return null;

  const photos: string[] = [];
  
  // Add model photo/thumbnail first if available
  if (model?.thumbnail_url) {
    photos.push(model.thumbnail_url);
  } else if (model?.photo_url) {
    photos.push(model.photo_url);
  }
  
  // Show photos for Utrecht, Alkmaar, and Den Haag
  if (city === 'utrecht') {
    const utrechtKunstwerk = kunstwerk as UtrechtKunstwerk;
    photos.push(...utrechtKunstwerk.photos);
  } else if (city === 'alkmaar') {
    const alkmaarKunstwerk = kunstwerk as AlkmaarKunstwerk;
    photos.push(...alkmaarKunstwerk.photos);
  } else if (city === 'denhaag') {
    const denhaagKunstwerk = kunstwerk as DenHaagKunstwerk;
    photos.push(...denhaagKunstwerk.photos);
  }

  const hasPhotos = photos.length > 0;
  const has3DModel = model && model.file_path;
  const currentPhoto = hasPhotos ? photos[currentPhotoIndex] : null;
  
  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };
  
  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };
  
  const description = city === 'utrecht' 
    ? (kunstwerk as UtrechtKunstwerk).description 
    : city === 'alkmaar'
    ? (kunstwerk as AlkmaarKunstwerk).description
    : city === 'denhaag'
    ? (kunstwerk as DenHaagKunstwerk).description
    : (kunstwerk as NijmegenKunstwerk).description || '';
  
  const websiteUrl = city === 'nijmegen' 
    ? (kunstwerk as NijmegenKunstwerk).websiteUrl 
    : null;
    
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
            
            {model && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium">
                  <Box className="w-5 h-5" />
                  <span>{t('Er is een 3D model beschikbaar', 'A 3D model is available')}</span>
                </div>
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
              {has3DModel && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (!model.file_path && model.photo_url) {
                      setShowPhotoViewer(true);
                    } else {
                      setShow3DViewer(true);
                    }
                  }}
                  className="gap-2 flex-1"
                >
                  <Box className="w-4 h-4" />
                  {t('Bekijk 3D Model', 'View 3D Model')}
                </Button>
              )}
              <Button
                variant={has3DModel ? "outline" : "default"}
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
      
      {show3DViewer && model && (
        <div className="fixed inset-0 z-[10000] bg-background flex flex-col">
          <div className="bg-background/98 backdrop-blur-sm border-b border-border p-3 md:p-4 flex-shrink-0">
            <div className="flex items-start gap-3">
              <Button 
                onClick={() => setShow3DViewer(false)} 
                variant="default"
                size="lg"
                className="shrink-0"
              >
                ← {t('Terug', 'Back')}
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-foreground truncate">{kunstwerk.name}</h2>
                {model.description && (
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{model.description}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <StandbeeldViewer 
              onClose={() => setShow3DViewer(false)}
              modelPath={model.file_path} 
            />
          </div>
        </div>
      )}
      
      {showPhotoViewer && model?.photo_url && (
        <PhotoViewer
          photoUrl={model.photo_url}
          name={kunstwerk.name}
          description={model.description}
          onClose={() => setShowPhotoViewer(false)}
        />
      )}
    </Dialog>
  );
};

export default KunstwerkViewer;
