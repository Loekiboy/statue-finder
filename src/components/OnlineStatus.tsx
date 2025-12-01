import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { setupOnlineStatusListeners } from "@/lib/serviceWorkerManager";
import { toast } from "sonner";

const OnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBadge, setShowBadge] = useState(!navigator.onLine);

  useEffect(() => {
    const cleanup = setupOnlineStatusListeners(
      () => {
        setIsOnline(true);
        setShowBadge(true);
        toast.success("Je bent weer online!", {
          duration: 3000,
        });
        
        // Hide badge after 3 seconds when back online
        setTimeout(() => setShowBadge(false), 3000);
      },
      () => {
        setIsOnline(false);
        setShowBadge(true);
        toast.error("Je bent offline. Sommige functies zijn beperkt.", {
          duration: 5000,
        });
      }
    );

    return cleanup;
  }, []);

  if (!showBadge) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <Badge 
        variant={isOnline ? "default" : "destructive"}
        className="px-4 py-2 text-sm font-medium shadow-lg"
      >
        {isOnline ? (
          <>
            <Wifi className="mr-2 h-4 w-4" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="mr-2 h-4 w-4" />
            Offline
          </>
        )}
      </Badge>
    </div>
  );
};

export default OnlineStatus;
