import { Button } from './ui/button';
import { ExternalLink, ChevronLeft, ChevronRight, Upload, Box, MapPin, X, Share2, Check, Download, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { downloadImage } from '@/lib/downloadUtils';
import { getLowResImageUrl } from '@/lib/imageUtils';
import { NijmegenKunstwerk } from '@/data/nijmegenKunstwerken';
import { UtrechtKunstwerk } from '@/data/utrechtKunstwerken';
import { AlkmaarKunstwerk } from '@/data/alkmaartKunstwerken';
import { DenHaagKunstwerk } from '@/data/denhaagKunstwerken';
import { DelftKunstwerk } from '@/data/delftKunstwerken';
import { DublinKunstwerk } from '@/data/dublinKunstwerken';
import { useState, useEffect } from 'react';
import QuickUploadDialog from './QuickUploadDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import StandbeeldViewer from './StandbeeldViewer';
import PhotoViewer from './PhotoViewer';
import { ImageZoom } from './ImageZoom';

interface Model {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  photo_url: string | null;
  artist?: string | null;
  year?: string | null;
  materials?: string | null;
  credits?: string | null;
  website_url?: string | null;
  source_city?: string | null;
  source_id?: string | null;
  is_municipal?: boolean;
}

interface KunstwerkViewerProps {
  kunstwerk: NijmegenKunstwerk | UtrechtKunstwerk | AlkmaarKunstwerk | DenHaagKunstwerk | DelftKunstwerk | DublinKunstwerk | any | null;
  city: 'nijmegen' | 'utrecht' | 'alkmaar' | 'denhaag' | 'delft' | 'dublin' | 'drenthe';
  model?: Model;
  onClose: () => void;
}

const KunstwerkViewer = ({ kunstwerk, city, model, onClose }: KunstwerkViewerProps) => {
  const { t } = useLanguage();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  
  if (!kunstwerk) return null;

  // Build photos array
  const photos: string[] = [];
  
  // Add model photo/thumbnail first if available
  if (model?.thumbnail_url) {
    photos.push(model.thumbnail_url);
  } else if (model?.photo_url) {
    photos.push(model.photo_url);
  }
  
  // Add kunstwerk photos for specific cities
  if (city === 'utrecht') {
    const utrechtKunstwerk = kunstwerk as UtrechtKunstwerk;
    photos.push(...utrechtKunstwerk.photos);
  } else if (city === 'alkmaar') {
    const alkmaarKunstwerk = kunstwerk as AlkmaarKunstwerk;
    photos.push(...alkmaarKunstwerk.photos);
  } else if (city === 'denhaag') {
    const denhaagKunstwerk = kunstwerk as DenHaagKunstwerk;
    photos.push(...denhaagKunstwerk.photos);
  } else if (city === 'dublin') {
    const dublinKunstwerk = kunstwerk as DublinKunstwerk;
    if (dublinKunstwerk.photos && dublinKunstwerk.photos.length > 0) {
      photos.push(...dublinKunstwerk.photos);
    }
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
  
  // Touch/swipe handling for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const minSwipeDistance = 50;
  const [swipeIndicator, setSwipeIndicator] = useState<'left' | 'right' | null>(null);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Slideshow functionality
  const startSlideshow = () => {
    setIsSlideshow(true);
    const interval = setInterval(() => {
      nextPhoto();
    }, 3000); // Change photo every 3 seconds
    setSlideshowInterval(interval);
  };
  
  const stopSlideshow = () => {
    setIsSlideshow(false);
    if (slideshowInterval) {
      clearInterval(slideshowInterval);
      setSlideshowInterval(null);
    }
  };
  
  const toggleSlideshow = () => {
    if (isSlideshow) {
      stopSlideshow();
    } else {
      startSlideshow();
    }
  };
  
  // Cleanup slideshow on unmount
  useEffect(() => {
    return () => {
      if (slideshowInterval) {
        clearInterval(slideshowInterval);
      }
    };
  }, [slideshowInterval]);
  
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setSwipeIndicator(null);
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    // Show swipe indicator
    if (touchStart) {
      const distance = touchStart - currentTouch;
      if (Math.abs(distance) > minSwipeDistance / 2) {
        setSwipeIndicator(distance > 0 ? 'left' : 'right');
      }
    }
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeIndicator(null);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && photos.length > 1) {
      nextPhoto();
    }
    if (isRightSwipe && photos.length > 1) {
      prevPhoto();
    }
    
    setSwipeIndicator(null);
  };
  
  // Keyboard shortcuts for photo navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when zoom is open (ImageZoom handles its own)
      if (showImageZoom || show3DViewer || showPhotoViewer) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (photos.length > 1) {
            e.preventDefault();
            prevPhoto();
          }
          break;
        case 'ArrowRight':
          if (photos.length > 1) {
            e.preventDefault();
            nextPhoto();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImageZoom, show3DViewer, showPhotoViewer, photos.length, onClose]);

  const handleShare = async () => {
    const kunstwerkId = model?.source_id || kunstwerk.id;
    const shareUrl = `${window.location.origin}/?kunstwerk=${city}-${kunstwerkId}`;
    const shareData = {
      title: kunstwerk.name,
      text: `Bekijk ${kunstwerk.name} door ${artist}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success(t('Gedeeld!', 'Shared!'));
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setIsSharing(true);
        toast.success(t('Link gekopieerd naar klembord', 'Link copied to clipboard'));
        setTimeout(() => setIsSharing(false), 2000);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
        toast.error(t('Kon niet delen', 'Could not share'));
      }
    }
  };

  const handleDownloadPhoto = async () => {
    if (currentPhoto) {
      try {
        await downloadImage(currentPhoto, kunstwerk.name);
        toast.success(t('Foto gedownload!', 'Photo downloaded!'));
      } catch (error) {
        toast.error(t('Download mislukt', 'Download failed'));
      }
    }
  };
  
  // Get description, artist, and other details
  const description = kunstwerk.description || '';
  const artist = kunstwerk.artist || 'Onbekende kunstenaar';
  const location = kunstwerk.location || `${kunstwerk.latitude?.toFixed(6)}, ${kunstwerk.longitude?.toFixed(6)}`;
  
  const websiteUrl = city === 'nijmegen' 
    ? (kunstwerk as NijmegenKunstwerk).websiteUrl 
    : null;
    
  const credits = kunstwerk.credits || (city === 'nijmegen' ? (kunstwerk as NijmegenKunstwerk).credits : null);
  const year = kunstwerk.year || null;
  const materials = kunstwerk.materials || null;
  
  const openInGoogleMaps = () => {
    const lat = kunstwerk.lat || kunstwerk.latitude || model?.latitude;
    const lon = kunstwerk.lon || kunstwerk.longitude || model?.longitude;
    if (lat && lon) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, '_blank');
    }
  };

  const hasCoordinates = !!(kunstwerk.lat || kunstwerk.latitude || model?.latitude);

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        <div className="bg-background/98 backdrop-blur-sm border-b border-border p-3 md:p-4 flex-shrink-0">
          <div className="flex items-start gap-3">
            <Button 
              onClick={onClose} 
              variant="default"
              size="lg"
              className="shadow-[var(--shadow-elevated)] hover:shadow-[var(--shadow-glow)] transition-all shrink-0"
            >
              <X className="h-5 w-5 mr-2" />
              {t('Sluiten', 'Close')}
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-foreground truncate">{kunstwerk.name}</h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{artist}</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 space-y-6">
            {hasPhotos && currentPhoto && (
              <div className="relative w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center group" style={{ minHeight: '400px' }}>
                {/* Swipe indicator */}
                {swipeIndicator && photos.length > 1 && (
                  <div className={`absolute top-1/2 -translate-y-1/2 z-10 bg-black/60 backdrop-blur-sm text-white p-4 rounded-full transition-all ${
                    swipeIndicator === 'left' ? 'right-4 animate-pulse' : 'left-4 animate-pulse'
                  }`}>
                    {swipeIndicator === 'left' ? '→' : '←'}
                  </div>
                )}
                <img
                  key={`photo-${currentPhotoIndex}-${currentPhoto}`}
                  src={currentPhoto}
                  alt={kunstwerk.name}
                  loading="eager"
                  className="max-w-full max-h-[600px] object-contain cursor-zoom-in transition-opacity hover:opacity-90"
                  onClick={() => {
                    setZoomedImageUrl(currentPhoto);
                    setShowImageZoom(true);
                  }}
                  onDoubleClick={() => {
                    setZoomedImageUrl(currentPhoto);
                    setShowImageZoom(true);
                  }}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Zoom hint overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none">
                  <div className="bg-black/60 text-white px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                    🔍 Klik om in te zoomen {photos.length > 1 && '• Swipe voor volgende foto'}
                  </div>
                </div>
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-10">
                      {currentPhotoIndex + 1} / {photos.length}
                    </div>
                    <button
                      onClick={toggleSlideshow}
                      className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10 flex items-center gap-2"
                      title={isSlideshow ? "Stop slideshow" : "Start slideshow"}
                    >
                      {isSlideshow ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                  </>
                )}
                {/* Download button */}
                <button
                  onClick={handleDownloadPhoto}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
                  title={t('Download foto', 'Download photo')}
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Locatie</h3>
                <p className="text-base mb-2">{location}</p>
                {hasCoordinates && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openInGoogleMaps}
                    className="gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    {t('Open in Google Maps', 'Open in Google Maps')}
                  </Button>
                )}
              </div>
              
              {year && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Jaar</h3>
                  <p className="text-base">{year}</p>
                </div>
              )}
              
              {materials && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Materiaal</h3>
                  <p className="text-base">{materials}</p>
                </div>
              )}
              
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
              
              <div className="flex gap-2 flex-wrap">
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
                {/* Only show upload button for non-Dublin artworks, or Dublin artworks without photos */}
                {(city !== 'dublin' || !hasPhotos) && (
                  <Button
                    variant={has3DModel ? "outline" : "default"}
                    size="sm"
                    onClick={() => setShowUploadDialog(true)}
                    className="gap-2 flex-1"
                  >
                    <Upload className="w-4 h-4" />
                    {t('Upload foto/model', 'Upload photo/model')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="gap-2 flex-1"
                >
                  {isSharing ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {t('Delen', 'Share')}
                </Button>
                {websiteUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(websiteUrl!, '_blank')}
                    className="gap-2 flex-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Meer informatie
                  </Button>
                )}
              </div>
              
              {city === 'alkmaar' && (
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => window.open('https://data.overheid.nl/dataset/kunstwerken-alkmaar--gemeente-alkmaar', '_blank')}
                    className="gap-2 p-0 h-auto text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Bron
                  </Button>
                </div>
              )}
              
              {city === 'delft' && (
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => window.open('https://erfgoed.delft.nl/kunst-in-de-openbare-ruimte', '_blank')}
                    className="gap-2 p-0 h-auto text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Bron
                  </Button>
                </div>
              )}
              
              {city === 'dublin' && 'source' in kunstwerk && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Bron: {kunstwerk.source}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <QuickUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        statueName={kunstwerk.name}
        latitude={kunstwerk.lat || kunstwerk.latitude}
        longitude={kunstwerk.lon || kunstwerk.longitude}
        isStreetArt={city === 'dublin'}
        hasPhotos={hasPhotos}
        description={kunstwerk.description || description}
        artist={artist}
        isMunicipal={model?.is_municipal || false}
      />
      
      {show3DViewer && model && kunstwerk && (
        <div className="fixed inset-0 z-[110] bg-background flex flex-col">
          <div className="bg-background/98 backdrop-blur-sm border-b border-border p-3 md:p-4 flex-shrink-0">
            <div className="flex items-start gap-3">
              <Button 
                onClick={() => {
                  setShow3DViewer(false);
                }} 
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
              onClose={() => {
                setShow3DViewer(false);
              }}
              modelPath={model.file_path}
              autoRotate={true}
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
      
      {showImageZoom && zoomedImageUrl && (
        <ImageZoom
          imageUrl={zoomedImageUrl}
          altText={kunstwerk.name}
          onClose={() => {
            setShowImageZoom(false);
            setZoomedImageUrl(null);
          }}
        />
      )}
    </>
  );
};

export default KunstwerkViewer;
