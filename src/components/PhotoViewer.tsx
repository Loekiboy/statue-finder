import { X } from 'lucide-react';
import { Button } from './ui/button';

interface PhotoViewerProps {
  photoUrl: string;
  name?: string;
  description?: string | null;
  onClose: () => void;
}

const PhotoViewer = ({ photoUrl, name, description, onClose }: PhotoViewerProps) => {
  return (
    <div className="fixed inset-0 z-30 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="bg-background/98 backdrop-blur-sm border-b border-border p-3 md:p-4 flex-shrink-0">
        <div className="flex items-start gap-3">
          <Button 
            onClick={onClose} 
            variant="default"
            size="lg"
            className="shadow-[var(--shadow-elevated)] hover:shadow-[var(--shadow-glow)] transition-all shrink-0"
          >
            <X className="h-5 w-5 mr-2" />
            Sluiten
          </Button>
          {name && (
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-foreground truncate">{name}</h2>
              {description && (
                <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full flex items-center justify-center p-4">
        <img 
          src={photoUrl} 
          alt={name || 'Photo'}
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
        />
      </div>
    </div>
  );
};

export default PhotoViewer;