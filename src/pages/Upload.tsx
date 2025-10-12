import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Upload as UploadIcon, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { z } from 'zod';
import { ThumbnailGenerator } from '@/components/ThumbnailGenerator';

const modelSchema = z.object({
  name: z.string().trim().min(1, 'Naam is verplicht').max(100, 'Naam mag maximaal 100 tekens zijn'),
  description: z.string().trim().max(1000, 'Beschrijving mag maximaal 1000 tekens zijn').optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const Upload = () => {
  const { t } = useLanguage();
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
  const [largeFileSize, setLargeFileSize] = useState<number>(0);
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
          title: t('Ongeldig bestand', 'Invalid file'),
          description: t('Upload alleen .stl bestanden', 'Upload only .stl files'),
          variant: 'destructive',
        });
        return;
      }
      
      // Check file size - show warning for files > 20MB
      const warningSize = 20 * 1024 * 1024; // 20MB
      
      if (selectedFile.size > warningSize) {
        setLargeFileSize(selectedFile.size);
        setShowSizeWarning(true);
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
      toast({ title: t('Selecteer een bestand', 'Select a file'), variant: 'destructive' });
      return;
    }
    
    if (latitude === null || longitude === null) {
      toast({ 
        title: t('Selecteer een locatie', 'Select a location'), 
        description: t('Klik op de kaart om een locatie te selecteren', 'Click on the map to select a location'),
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
      const errorMessage = validationResult.error.errors[0]?.message || t('Ongeldige invoer', 'Invalid input');
      toast({
        title: t('Validatiefout', 'Validation error'),
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('Niet ingelogd', 'Not logged in'));

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
        ? t('Invoer voldoet niet aan de vereisten', 'Input does not meet requirements')
        : t('Er is een fout opgetreden bij het uploaden', 'An error occurred during upload');
      
      toast({
        title: t('Upload mislukt', 'Upload failed'),
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
      if (!user || !uploadedFilePath) throw new Error(t('Niet ingelogd', 'Not logged in'));

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
        throw new Error(t('Validatiefout', 'Validation error'));
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

      toast({ title: t('Model geüpload!', 'Model uploaded!') });
      navigate('/');
    } catch (error: any) {
      const safeMessage = error.code === '23514' 
        ? t('Invoer voldoet niet aan de vereisten', 'Input does not meet requirements')
        : t('Er is een fout opgetreden bij het uploaden', 'An error occurred during upload');
      
      toast({
        title: t('Upload mislukt', 'Upload failed'),
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
            <AlertDialogTitle>{t('Model is groter dan 20 MB', 'Model is larger than 20 MB')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {t(`Het geselecteerde bestand is ${(largeFileSize / 1024 / 1024).toFixed(2)} MB. Voor betere prestaties raden we aan om het model eerst te verkleinen.`, 
                   `The selected file is ${(largeFileSize / 1024 / 1024).toFixed(2)} MB. For better performance, we recommend reducing the model first.`)}
              </p>
              <div>
                <p className="font-semibold mb-2">{t('Handige tools om je model te verkleinen:', 'Useful tools to reduce your model:')}</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Blender</strong> - {t('Gratis 3D software met decimatie modifier', 'Free 3D software with decimation modifier')}</li>
                  <li><strong>MeshLab</strong> - {t('Gratis tool specifiek voor mesh simplificatie', 'Free tool specifically for mesh simplification')}</li>
                  <li><strong>Online STL reducers</strong> - {t('Zoals convertio.co of meshconvert.com', 'Such as convertio.co or meshconvert.com')}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setLargeFileSize(0);
              setShowSizeWarning(false);
            }}>
              {t('Oké, begrepen', 'OK, understood')}
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
          {t('Terug naar kaart', 'Back to map')}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="h-6 w-6" />
              {t('3D Model Uploaden', 'Upload 3D Model')}
            </CardTitle>
            <CardDescription>{t('Upload je eigen .stl 3D model met beschrijving', 'Upload your own .stl 3D model with description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('Naam', 'Name')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('Bijv: Standbeeld Centrum', 'E.g: City Center Statue')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('Beschrijving', 'Description')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('Beschrijf je model...', 'Describe your model...')}
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
                    {t('Geselecteerd:', 'Selected:')} {file.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('Locatie (klik op de kaart)', 'Location (click on the map)')}
                </Label>
                <div 
                  ref={mapContainer} 
                  className="h-64 w-full rounded-md border"
                />
                {latitude !== null && longitude !== null && (
                  <p className="text-sm text-muted-foreground">
                    {t('Geselecteerd:', 'Selected:')} {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {t(loading ? 'Uploaden...' : 'Upload Model', loading ? 'Uploading...' : 'Upload Model')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Upload;
