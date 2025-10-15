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
import { ArrowLeft, Upload as UploadIcon, MapPin, Image as ImageIcon } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { z } from 'zod';
import { ThumbnailGenerator } from '@/components/ThumbnailGenerator';
import ExifReader from 'exifreader';
import imageCompression from 'browser-image-compression';

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
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [generateThumbnail, setGenerateThumbnail] = useState(false);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string | null>(null);
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check if it's an image
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          title: t('Ongeldig bestand', 'Invalid file'),
          description: t('Upload alleen afbeeldingen', 'Upload only images'),
          variant: 'destructive',
        });
        return;
      }

      try {
        // Try to extract EXIF data (wrapped in try-catch for mobile compatibility)
        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const tags = ExifReader.load(arrayBuffer);
          
          // Check for GPS data
          if (tags.GPSLatitude && tags.GPSLongitude) {
            const lat = parseFloat(tags.GPSLatitude.description);
            const lon = parseFloat(tags.GPSLongitude.description);
            
            if (!isNaN(lat) && !isNaN(lon)) {
              setLatitude(lat);
              setLongitude(lon);
              
              // Update map marker
              if (map.current) {
                if (marker.current) {
                  marker.current.remove();
                }
                marker.current = L.marker([lat, lon]).addTo(map.current);
                map.current.setView([lat, lon], 15);
              }
              
              toast({ 
                title: t('Locatie gevonden!', 'Location found!'),
                description: t('Locatie is automatisch ingesteld uit de foto', 'Location was automatically set from the photo')
              });
            }
          }
        } catch (exifError) {
          console.log('No EXIF data found or error reading EXIF:', exifError);
          // Continue without EXIF data - not a critical error
        }

        // Compress image if needed
        const maxSize = 3 * 1024 * 1024; // 3MB
        let processedFile = selectedFile;
        
        if (selectedFile.size > maxSize) {
          toast({
            title: t('Comprimeren...', 'Compressing...'),
            description: t('Foto wordt verkleind', 'Photo is being compressed')
          });
          
          const options = {
            maxSizeMB: 3,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: selectedFile.type as any,
          };
          
          try {
            processedFile = await imageCompression(selectedFile, options);
            
            toast({
              title: t('Foto gecomprimeerd!', 'Photo compressed!'),
              description: t(`Van ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB naar ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`, 
                            `From ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB to ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`)
            });
          } catch (compressionError) {
            console.error('Compression error:', compressionError);
            toast({
              title: t('Compressie mislukt', 'Compression failed'),
              description: t('Foto wordt gebruikt zonder compressie', 'Photo will be used without compression')
            });
            // Use original file if compression fails
          }
        }
        
        setPhoto(processedFile);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.onerror = () => {
          toast({
            title: t('Fout bij laden preview', 'Error loading preview'),
            variant: 'destructive',
          });
        };
        reader.readAsDataURL(processedFile);
        
      } catch (error) {
        console.error('Error processing photo:', error);
        toast({
          title: t('Fout bij verwerken foto', 'Error processing photo'),
          description: String(error),
          variant: 'destructive',
        });
      }
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
    
    if (!photo) {
      toast({ title: t('Selecteer een foto', 'Select a photo'), variant: 'destructive' });
      return;
    }
    
    if (latitude === null || longitude === null) {
      toast({ 
        title: t('Selecteer een locatie', 'Select a location'), 
        description: t('Klik op de kaart om een locatie te selecteren of upload een foto met locatiegegevens', 'Click on the map to select a location or upload a photo with location data'),
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

      // Upload photo
      const photoExt = photo.name.split('.').pop();
      const photoFileName = `${user.id}/${Date.now()}_photo.${photoExt}`;
      
      const { error: photoUploadError } = await supabase.storage
        .from('model-thumbnails')
        .upload(photoFileName, photo);

      if (photoUploadError) throw photoUploadError;

      // Set the uploaded file paths and trigger thumbnail generation
      setUploadedFilePath(fileName);
      setUploadedPhotoPath(photoFileName);
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
      if (!user || !uploadedFilePath || !uploadedPhotoPath) throw new Error(t('Niet ingelogd', 'Not logged in'));

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Upload thumbnail to storage
      const thumbnailFileName = `${user.id}/${Date.now()}_thumb.png`;
      const { error: thumbnailUploadError } = await supabase.storage
        .from('model-thumbnails')
        .upload(thumbnailFileName, blob);

      if (thumbnailUploadError) throw thumbnailUploadError;

      // Get public URLs
      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from('model-thumbnails')
        .getPublicUrl(thumbnailFileName);
      
      const { data: { publicUrl: photoUrl } } = supabase.storage
        .from('model-thumbnails')
        .getPublicUrl(uploadedPhotoPath);

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

      // Insert model with thumbnail and photo URLs
      const { error: dbError } = await supabase
        .from('models')
        .insert({
          user_id: user.id,
          name: validationResult.data.name,
          description: validationResult.data.description || null,
          file_path: uploadedFilePath,
          latitude: validationResult.data.latitude,
          longitude: validationResult.data.longitude,
          thumbnail_url: thumbnailUrl,
          photo_url: photoUrl,
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
                <Label htmlFor="photo" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {t('Foto van het standbeeld', 'Photo of the statue')} *
                </Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  required
                />
                {photoPreview && (
                  <div className="mt-2">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="max-h-48 rounded-md object-cover"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('Als je foto locatiegegevens bevat, wordt de locatie automatisch ingevuld', 'If your photo contains location data, the location will be filled automatically')}
                </p>
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
                  {t('Locatie (klik op de kaart of upload foto met GPS-data)', 'Location (click on the map or upload photo with GPS data)')}
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
