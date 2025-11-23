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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Zoek op naam, kunstenaar of stad..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-background border rounded-md shadow-lg z-50">
          <ScrollArea className="h-[400px]">
            <div className="p-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors"
                >
                  <div className="font-medium">{result.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {result.artist} • {result.city}
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
