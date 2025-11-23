import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { nijmegenKunstwerken } from '@/data/nijmegenKunstwerken';
import { utrechtKunstwerken } from '@/data/utrechtKunstwerken';
import { alkmaartKunstwerken } from '@/data/alkmaartKunstwerken';
import { denhaagKunstwerken } from '@/data/denhaagKunstwerken';
import { delftKunstwerken } from '@/data/delftKunstwerken';
import { dublinKunstwerken } from '@/data/dublinKunstwerken';

interface SearchResult {
  id: string;
  name: string;
  artist: string;
  city: string;
  lat: number;
  lon: number;
  type: 'nijmegen' | 'utrecht' | 'alkmaar' | 'denhaag' | 'delft' | 'dublin' | 'model';
}

interface SearchBarProps {
  models: any[];
  onResultClick: (result: SearchResult) => void;
}

export const SearchBar = ({ models, onResultClick }: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const allResults: SearchResult[] = [];

    // Search Nijmegen
    nijmegenKunstwerken.forEach(artwork => {
      if (
        artwork.name.toLowerCase().includes(query) ||
        artwork.artist.toLowerCase().includes(query) ||
        'nijmegen'.includes(query)
      ) {
        allResults.push({
          id: artwork.id,
          name: artwork.name,
          artist: artwork.artist,
          city: 'Nijmegen',
          lat: artwork.lat,
          lon: artwork.lon,
          type: 'nijmegen'
        });
      }
    });

    // Search Utrecht
    utrechtKunstwerken.forEach(artwork => {
      if (
        artwork.name.toLowerCase().includes(query) ||
        artwork.artist.toLowerCase().includes(query) ||
        'utrecht'.includes(query)
      ) {
        allResults.push({
          id: artwork.id,
          name: artwork.name,
          artist: artwork.artist,
          city: 'Utrecht',
          lat: artwork.lat,
          lon: artwork.lon,
          type: 'utrecht'
        });
      }
    });

    // Search Alkmaar
    alkmaartKunstwerken.forEach(artwork => {
      if (
        artwork.name.toLowerCase().includes(query) ||
        artwork.artist.toLowerCase().includes(query) ||
        'alkmaar'.includes(query)
      ) {
        allResults.push({
          id: artwork.id,
          name: artwork.name,
          artist: artwork.artist,
          city: 'Alkmaar',
          lat: artwork.lat,
          lon: artwork.lon,
          type: 'alkmaar'
        });
      }
    });

    // Search Den Haag
    denhaagKunstwerken.forEach(artwork => {
      if (
        artwork.name.toLowerCase().includes(query) ||
        artwork.artist.toLowerCase().includes(query) ||
        'den haag'.includes(query) ||
        'denhaag'.includes(query)
      ) {
        allResults.push({
          id: artwork.id,
          name: artwork.name,
          artist: artwork.artist,
          city: 'Den Haag',
          lat: artwork.lat,
          lon: artwork.lon,
          type: 'denhaag'
        });
      }
    });

    // Search Delft
    delftKunstwerken.forEach(artwork => {
      if (
        artwork.name.toLowerCase().includes(query) ||
        artwork.artist.toLowerCase().includes(query) ||
        'delft'.includes(query)
      ) {
        allResults.push({
          id: artwork.id,
          name: artwork.name,
          artist: artwork.artist,
          city: 'Delft',
          lat: artwork.lat,
          lon: artwork.lon,
          type: 'delft'
        });
      }
    });
    
    // Search Dublin
    dublinKunstwerken.forEach(artwork => {
      if (
        artwork.name.toLowerCase().includes(query) ||
        artwork.artist.toLowerCase().includes(query) ||
        'dublin'.includes(query)
      ) {
        allResults.push({
          id: artwork.id,
          name: artwork.name,
          artist: artwork.artist,
          city: 'Dublin',
          lat: artwork.lat,
          lon: artwork.lon,
          type: 'dublin'
        });
      }
    });

    // Search user models
    models.forEach(model => {
      if (
        model.name.toLowerCase().includes(query) ||
        (model.artist && model.artist.toLowerCase().includes(query))
      ) {
        allResults.push({
          id: model.id,
          name: model.name,
          artist: model.artist || 'Onbekend',
          city: 'Gebruiker model',
          lat: model.latitude,
          lon: model.longitude,
          type: 'model'
        });
      }
    });

    setResults(allResults.slice(0, 50));
    setIsOpen(allResults.length > 0);
  }, [searchQuery, models]);

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result);
    handleClear();
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Zoek op naam, kunstenaar of stad..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 h-12 text-base bg-background/95 backdrop-blur-sm border-2 focus-visible:ring-2 focus-visible:ring-primary shadow-lg"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent/80"
            onClick={handleClear}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-background/98 backdrop-blur-md border-2 rounded-lg shadow-2xl z-50">
          <ScrollArea className="h-[400px]">
            <div className="p-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-4 hover:bg-accent/80 rounded-lg transition-all duration-200 hover:shadow-md border border-transparent hover:border-border"
                >
                  <div className="font-semibold text-base mb-1">{result.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <span>{result.artist}</span>
                    <span>•</span>
                    <span className="text-primary font-medium">{result.city}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
