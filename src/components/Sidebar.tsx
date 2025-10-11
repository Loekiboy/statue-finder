import { Home, MapPin } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="fixed left-0 top-0 z-20 flex h-screen w-16 flex-col gap-4 bg-card p-3 shadow-[var(--shadow-elevated)]">
      <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90">
        <Home className="h-5 w-5" />
      </button>
      <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-all hover:bg-secondary/90">
        <MapPin className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Sidebar;
