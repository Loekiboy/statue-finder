import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Upload from "./pages/Upload";
import Models from "./pages/Models";
import Profile from "./pages/Profile";
import Discoveries from "./pages/Discoveries";
import Leaderboards from "./pages/Leaderboards";
import NotFound from "./pages/NotFound";
import Favorites from "./pages/Favorites";
import Stats from "./pages/Stats";
import RoutePlanner from "./pages/Routes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouterRoutes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/models" element={<Models />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/discoveries" element={<Discoveries />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/routes" element={<RoutePlanner />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </BrowserRouter>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
