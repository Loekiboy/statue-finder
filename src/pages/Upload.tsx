import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload as UploadIcon, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const Upload = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith('.stl')) {
        toast({
          title: 'Ongeldig bestand',
          description: 'Upload alleen .stl bestanden',
          variant: 'destructive',
        });
        return;
      }
      // Check file size (40MB = 40 * 1024 * 1024 bytes)
      const maxSize = 40 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast({
          title: 'Bestand te groot',
          description: 'Maximale bestandsgrootte is 40MB',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map at default location (Amsterdam)
    map.current = L.map(mapContainer.current).setView([52.3676, 4.9041], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map.current);

    // Add click handler to place marker
    map.current.on('click', (e: L.LeafletMouseEvent) => {
      if (!map.current) return;

      // Remove existing marker if any
      if (marker.current) {
        marker.current.remove();
      }

      // Add new marker
      marker.current = L.marker(e.latlng).addTo(map.current);
      
      // Update coordinates
      setLatitude(e.latlng.lat);
      setLongitude(e.latlng.lng);
      
      toast({ title: 'Locatie geselecteerd!' });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: 'Selecteer een bestand', variant: 'destructive' });
      return;
    }
    
    if (latitude === null || longitude === null) {
      toast({ 
        title: 'Selecteer een locatie', 
        description: 'Klik op de kaart om een locatie te selecteren',
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Niet ingelogd');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('models')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('models')
        .insert({
          user_id: user.id,
          name,
          description,
          file_path: fileName,
          latitude,
          longitude,
        });

      if (dbError) throw dbError;

      toast({ title: 'Model geüpload!' });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Upload mislukt',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="mx-auto max-w-2xl pt-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar kaart
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="h-6 w-6" />
              3D Model Uploaden
            </CardTitle>
            <CardDescription>Upload je eigen .stl 3D model met beschrijving</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Naam</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Bijv: Standbeeld Centrum"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschrijving</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beschrijf je model..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">3D Model (.stl)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".stl"
                  onChange={handleFileChange}
                  required
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Geselecteerd: {file.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Locatie (klik op de kaart)
                </Label>
                <div 
                  ref={mapContainer} 
                  className="h-64 w-full rounded-md border"
                />
                {latitude !== null && longitude !== null && (
                  <p className="text-sm text-muted-foreground">
                    Geselecteerd: {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Uploaden...' : 'Upload Model'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Upload;
