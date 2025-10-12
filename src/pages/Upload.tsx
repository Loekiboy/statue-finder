import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload as UploadIcon, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { z } from 'zod';
import { ThumbnailGenerator } from '@/components/ThumbnailGenerator';
import { simplifySTL } from '@/lib/stlSimplifier';

const modelSchema = z.object({
  name: z.string().trim().min(1, 'Naam is verplicht').max(100, 'Naam mag maximaal 100 tekens zijn'),
  description: z.string().trim().max(1000, 'Beschrijving mag maximaal 1000 tekens zijn').optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const Upload = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [generateThumbnail, setGenerateThumbnail] = useState(false);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [largeFile, setLargeFile] = useState<File | null>(null);
  const [originalFileSize, setOriginalFileSize] = useState<number>(0);
  const [wasSimplified, setWasSimplified] = useState(false);
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
      
      // Check file size - show warning for files > 20MB
      const warningSize = 20 * 1024 * 1024; // 20MB
      const maxSize = 40 * 1024 * 1024; // 40MB hard limit
      
      if (selectedFile.size > maxSize) {
        toast({
          title: 'Bestand te groot',
          description: 'Maximale bestandsgrootte is 40MB',
          variant: 'destructive',
        });
        return;
      }
      
      if (selectedFile.size > warningSize) {
        setLargeFile(selectedFile);
        setShowSizeWarning(true);
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleSimplifyAndContinue = async () => {
    if (!largeFile) return;
    
    setShowSizeWarning(false);
    setLoading(true);
    setOriginalFileSize(largeFile.size);
    
    try {
      toast({
        title: 'Model wordt versimpeld...',
        description: 'Dit kan even duren',
      });
      
      // Simplify in browser - remove 2/3 of triangles
      const simplifiedFile = await simplifySTL(largeFile, 0.33);
      
      setFile(simplifiedFile);
      setLargeFile(null);
      setWasSimplified(true);
      
      // Don't show size message yet - will show after location selection
    } catch (error) {
      console.error('Simplification error:', error);
      toast({
        title: 'Versimpeling mislukt',
        description: 'Probeer een kleiner bestand of versimpel het handmatig',
        variant: 'destructive',
      });
      setWasSimplified(false);
      setOriginalFileSize(0);
    } finally {
      setLoading(false);
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
      
      // Show location selected message
      toast({ title: 'Locatie geselecteerd!' });
      
      // Show simplification result after location selection
      if (wasSimplified && file) {
        toast({
          title: 'Model versimpeld!',
          description: `Van ${(originalFileSize / 1024 / 1024).toFixed(2)} MB naar ${(file.size / 1024 / 1024).toFixed(2)} MB`,
        });
        setWasSimplified(false); // Reset flag
      }
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

    // Validate input data
    const validationResult = modelSchema.safeParse({
      name,
      description: description || undefined,
      latitude,
      longitude,
    });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || 'Ongeldige invoer';
      toast({
        title: 'Validatiefout',
        description: errorMessage,
        variant: 'destructive',
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

      // Set the uploaded file path and trigger thumbnail generation
      setUploadedFilePath(fileName);
      setGenerateThumbnail(true);
    } catch (error: any) {
      const safeMessage = error.code === '23514' 
        ? 'Invoer voldoet niet aan de vereisten'
        : 'Er is een fout opgetreden bij het uploaden';
      
      toast({
        title: 'Upload mislukt',
        description: safeMessage,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleThumbnailGenerated = async (dataUrl: string) => {
    setThumbnailDataUrl(dataUrl);
    setGenerateThumbnail(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !uploadedFilePath) throw new Error('Niet ingelogd');

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Upload thumbnail to storage
      const thumbnailFileName = `${user.id}/${Date.now()}_thumb.png`;
      const { error: thumbnailUploadError } = await supabase.storage
        .from('model-thumbnails')
        .upload(thumbnailFileName, blob);

      if (thumbnailUploadError) throw thumbnailUploadError;

      // Get public URL for thumbnail
      const { data: { publicUrl } } = supabase.storage
        .from('model-thumbnails')
        .getPublicUrl(thumbnailFileName);

      // Validate input data again for DB insert
      const validationResult = modelSchema.safeParse({
        name,
        description: description || undefined,
        latitude,
        longitude,
      });

      if (!validationResult.success) {
        throw new Error('Validatiefout');
      }

      // Insert model with thumbnail URL
      const { error: dbError } = await supabase
        .from('models')
        .insert({
          user_id: user.id,
          name: validationResult.data.name,
          description: validationResult.data.description || null,
          file_path: uploadedFilePath,
          latitude: validationResult.data.latitude,
          longitude: validationResult.data.longitude,
          thumbnail_url: publicUrl,
        });

      if (dbError) throw dbError;

      toast({ title: 'Model geüpload!' });
      navigate('/');
    } catch (error: any) {
      const safeMessage = error.code === '23514' 
        ? 'Invoer voldoet niet aan de vereisten'
        : 'Er is een fout opgetreden bij het uploaden';
      
      toast({
        title: 'Upload mislukt',
        description: safeMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <AlertDialog open={showSizeWarning} onOpenChange={setShowSizeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Model is groter dan 20 MB</AlertDialogTitle>
            <AlertDialogDescription>
              Het geselecteerde bestand is {largeFile ? (largeFile.size / 1024 / 1024).toFixed(2) : '0'} MB.
              De bestandsgrootte kan automatisch verkleind worden naar ongeveer 20 MB door het aantal polygonen te verminderen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setLargeFile(null);
              setShowSizeWarning(false);
            }}>
              Kies ander model
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSimplifyAndContinue} disabled={loading}>
              {loading ? 'Bezig...' : 'Ga door'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {generateThumbnail && uploadedFilePath && (
        <ThumbnailGenerator
          modelPath={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/models/${uploadedFilePath}`}
          onThumbnailGenerated={handleThumbnailGenerated}
        />
      )}
      
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
