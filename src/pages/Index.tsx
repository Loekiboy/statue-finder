import MapView from '@/components/MapView';
import Sidebar from '@/components/Sidebar';

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      
      <main className="h-screen pl-16">
        <MapView />
      </main>
    </div>
  );
};

export default Index;
