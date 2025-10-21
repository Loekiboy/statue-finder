import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ExternalLink } from 'lucide-react';
import { NijmegenKunstwerk } from '@/data/nijmegenKunstwerken';

interface KunstwerkViewerProps {
  kunstwerk: NijmegenKunstwerk | null;
  onClose: () => void;
}

const KunstwerkViewer = ({ kunstwerk, onClose }: KunstwerkViewerProps) => {
  if (!kunstwerk) return null;

  const getPhotoUrl = (photoId: string | null) => {
    if (!photoId) return null;
    return `https://www.nijmegen.nl/kos/fotos/${photoId}.jpg`;
  };

  const photoUrl = getPhotoUrl(kunstwerk.photoId);

  return (
    <Dialog open={!!kunstwerk} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{kunstwerk.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {photoUrl && (
            <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden">
              <img 
                src={photoUrl} 
                alt={kunstwerk.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
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
            
            {kunstwerk.credits && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Eigendom van</h3>
                <p className="text-base">{kunstwerk.credits}</p>
              </div>
            )}
            
            {kunstwerk.websiteUrl && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(kunstwerk.websiteUrl!, '_blank')}
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
