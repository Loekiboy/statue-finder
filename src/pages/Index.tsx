import { useState } from 'react';
import MapView from '@/components/MapView';
import ModelViewer from '@/components/ModelViewer';
import { Map, Box } from 'lucide-react';

const Index = () => {
  const [activeView, setActiveView] = useState<'map' | 'model'>('map');

  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-background/95 to-background/0 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Standbeeld Locatie</h1>
          <div className="flex gap-2 rounded-full bg-card p-1 shadow-[var(--shadow-elevated)]">
            <button
              onClick={() => setActiveView('map')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                activeView === 'map'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Map className="h-4 w-4" />
              Kaart
            </button>
            <button
              onClick={() => setActiveView('model')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                activeView === 'model'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Box className="h-4 w-4" />
              3D Model
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-screen">
        {activeView === 'map' ? (
          <MapView />
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <div className="h-[600px] w-full max-w-4xl">
              <ModelViewer />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
