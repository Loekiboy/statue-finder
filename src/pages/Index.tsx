import MapView from '@/components/MapView';

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <header className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-background/95 to-background/0 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Standbeeld Locatie</h1>
        </div>
      </header>

      <main className="h-screen">
        <MapView />
      </main>
    </div>
  );
};

export default Index;
