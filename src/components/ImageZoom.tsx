import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Info } from 'lucide-react';
import { Button } from './ui/button';
import { downloadImage } from '@/lib/downloadUtils';
import { toast } from 'sonner';

interface ImageZoomProps {
  imageUrl: string;
  altText: string;
  onClose: () => void;
}

export const ImageZoom = ({ imageUrl, altText, onClose }: ImageZoomProps) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser behavior for our shortcuts
      if (['+', '=', '-', 'r', 'R', '0', 'Escape', '?'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          handleRotate();
          break;
        case '0':
          handleReset();
          break;
        case 'Escape':
          onClose();
          break;
        case '?':
          setShowHelp(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scale, rotation, position]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = async () => {
    try {
      await downloadImage(imageUrl, altText);
      toast.success('Afbeelding gedownload!');
    } catch (error) {
      toast.error('Download mislukt');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && scale > 1 && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowHelp(prev => !prev)}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm"
            title="Toon sneltoetsen (?)"
          >
            <Info className="h-4 w-4 text-white" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm"
          >
            <ZoomIn className="h-4 w-4 text-white" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm"
          >
            <ZoomOut className="h-4 w-4 text-white" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleRotate}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm"
          >
            <RotateCw className="h-4 w-4 text-white" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white"
          >
            Reset
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleDownload}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm"
            title="Download afbeelding"
          >
            <Download className="h-4 w-4 text-white" />
          </Button>
        </div>
        <Button
          variant="secondary"
          size="icon"
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm"
        >
          <X className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm z-10">
        {Math.round(scale * 100)}%
      </div>

      {/* Keyboard shortcuts help */}
      {showHelp && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md text-white p-6 rounded-2xl shadow-2xl max-w-md z-10 border border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Sneltoetsen
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-8">
              <span className="text-white/70">Zoom in</span>
              <kbd className="bg-white/10 px-2 py-1 rounded">+</kbd>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/70">Zoom uit</span>
              <kbd className="bg-white/10 px-2 py-1 rounded">-</kbd>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/70">Roteren</span>
              <kbd className="bg-white/10 px-2 py-1 rounded">R</kbd>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/70">Reset</span>
              <kbd className="bg-white/10 px-2 py-1 rounded">0</kbd>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/70">Sluiten</span>
              <kbd className="bg-white/10 px-2 py-1 rounded">ESC</kbd>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/70">Help weergeven</span>
              <kbd className="bg-white/10 px-2 py-1 rounded">?</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Image container */}
      <div 
        className="flex-1 flex items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={imageUrl}
          alt={altText}
          className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center center'
          }}
          draggable={false}
        />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs text-center">
        {scale > 1 ? 'Sleep om te verplaatsen' : 'Klik op de afbeelding of gebruik zoom knoppen'}
      </div>
    </div>
  );
};
