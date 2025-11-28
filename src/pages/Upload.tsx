import { useState, useEffect, useRef, lazy, Suspense } from 'react';
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
import { ArrowLeft, Upload as UploadIcon, MapPin, Image as ImageIcon, Link as LinkIcon, X } from 'lucide-react';
import { z } from 'zod';
import { ThumbnailGenerator } from '@/components/ThumbnailGenerator';
import ExifReader from 'exifreader';
import imageCompression from 'browser-image-compression';
import type * as L from 'leaflet';
import { nijmegenKunstwerken } from '@/data/nijmegenKunstwerken';
import { utrechtKunstwerken } from '@/data/utrechtKunstwerken';
import { alkmaartKunstwerken } from '@/data/alkmaartKunstwerken';
import { denhaagKunstwerken } from '@/data/denhaagKunstwerken';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Lazy load Leaflet only when needed
let LeafletLib: typeof L | null = null;
const loadLeaflet = async () => {
  if (!LeafletLib) {
    LeafletLib = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
  }
  return LeafletLib;
};

const modelSchema = z.object({
  name: z.string().trim().min(1, 'Naam is verplicht').max(100, 'Naam mag maximaal 100 tekens zijn'),
  description: z.string().trim().max(1000, 'Beschrijving mag maximaal 1000 tekens zijn').optional(),
  infoLink: z.string().url('Voer een geldige URL in').optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Required field label component
const RequiredLabel = ({ children, required = true }: { children: React.ReactNode; required?: boolean }) => (
  <span className="flex items-center gap-1">
    {children}
    {required && <span className="text-destructive">*</span>}
  </span>
);

const Upload = () => {
  const { t } = useLanguage();
  const [uploadType, setUploadType] = useState<'photo' | 'model' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [infoLink, setInfoLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [manualLocation, setManualLocation] = useState(false);
  const [locationLocked, setLocationLocked] = useState(false);
  const [isMunicipalArtwork, setIsMunicipalArtwork] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generateThumbnail, setGenerateThumbnail] = useState(false);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadedPhotoPaths, setUploadedPhotoPaths] = useState<string[]>([]);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [largeFileSize, setLargeFileSize] = useState<number>(0);
  const [mapReady, setMapReady] = useState(false);
  const [selectedKunstwerk, setSelectedKunstwerk] = useState<{id: string, city: 'nijmegen' | 'utrecht' | 'alkmaar' | 'denhaag'} | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);

  // Check for pre-filled location from OSM statue
  useEffect(() => {
    const uploadLocationData = localStorage.getItem('uploadLocation');
    if (uploadLocationData) {
      try {
        const { lat, lon, name: statueName, description: artworkDescription, artist: artworkArtist, isMunicipal, locked } = JSON.parse(uploadLocationData);
        setLatitude(lat);
        setLongitude(lon);
        setName(statueName || '');
        setDescription(artworkDescription || '');
        setManualLocation(true);
        setLocationLocked(locked || false);
        setIsMunicipalArtwork(isMunicipal || false);
        
        // Try to find matching kunstwerk by location (within ~50m)
        const threshold = 0.0005; // approximately 50m
        const foundNijmegenKunstwerk = nijmegenKunstwerken.find(k => 
          Math.abs(k.lat - lat) < threshold && Math.abs(k.lon - lon) < threshold
        );
        
        if (foundNijmegenKunstwerk) {
          setSelectedKunstwerk({ id: foundNijmegenKunstwerk.id, city: 'nijmegen' });
        } else {
          const foundUtrechtKunstwerk = utrechtKunstwerken.find(k => 
            Math.abs(k.lat - lat) < threshold && Math.abs(k.lon - lon) < threshold
          );
          if (foundUtrechtKunstwerk) {
            setSelectedKunstwerk({ id: foundUtrechtKunstwerk.id, city: 'utrecht' });
          } else {
            const foundAlkmaarKunstwerk = alkmaartKunstwerken.find(k => 
              Math.abs(k.lat - lat) < threshold && Math.abs(k.lon - lon) < threshold
            );
            if (foundAlkmaarKunstwerk) {
              setSelectedKunstwerk({ id: foundAlkmaarKunstwerk.id, city: 'alkmaar' });
            } else {
              const foundDenHaagKunstwerk = denhaagKunstwerken.find(k => 
                Math.abs(k.lat - lat) < threshold && Math.abs(k.lon - lon) < threshold
              );
              if (foundDenHaagKunstwerk) {
                setSelectedKunstwerk({ id: foundDenHaagKunstwerk.id, city: 'denhaag' });
              }
            }
          }
        }
        
        localStorage.removeItem('uploadLocation');
      } catch (e) {
        console.error('Error parsing uploadLocation:', e);
      }
    }
    
    // Check for pre-filled upload type
    const uploadTypeData = localStorage.getItem('uploadType');
    if (uploadTypeData && (uploadTypeData === 'photo' || uploadTypeData === 'model')) {
      setUploadType(uploadTypeData);
      localStorage.removeItem('uploadType');
    }
  }, []);

  // Place marker when location is set and map is ready
  useEffect(() => {
    if (mapReady && latitude !== null && longitude !== null) {
      const placeMarker = async () => {
        const leaflet = await loadLeaflet();
        if (map.current) {
          if (marker.current) {
            marker.current.remove();
          }
          marker.current = leaflet.marker([latitude, longitude]).addTo(map.current);
          map.current.setView([latitude, longitude], 15);
        }
      };
      placeMarker();
    }
  }, [mapReady, latitude, longitude]);

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
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      // Filter only images
      const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length !== selectedFiles.length) {
        toast({
          title: t('Sommige bestanden overgeslagen', 'Some files skipped'),
          description: t('Alleen afbeeldingen worden geaccepteerd', 'Only images are accepted'),
          variant: 'default',
        });
      }

      if (imageFiles.length === 0) {
        toast({
          title: t('Ongeldig bestand', 'Invalid file'),
          description: t('Upload alleen afbeeldingen', 'Upload only images'),
          variant: 'destructive',
        });
        return;
      }

      try {
        // Try to extract EXIF data from the first image (wrapped in try-catch for mobile compatibility)
        const firstFile = imageFiles[0];
        try {
          const arrayBuffer = await firstFile.arrayBuffer();
          const tags = ExifReader.load(arrayBuffer);
          
          // Check for GPS data
          if (tags.GPSLatitude && tags.GPSLongitude) {
            const lat = parseFloat(tags.GPSLatitude.description);
            const lon = parseFloat(tags.GPSLongitude.description);
            
            if (!isNaN(lat) && !isNaN(lon)) {
              setLatitude(lat);
              setLongitude(lon);
              setManualLocation(false);
              
              toast({ 
                title: t('Locatie gevonden!', 'Location found!'),
                description: t('Locatie is automatisch ingesteld uit de eerste foto', 'Location was automatically set from the first photo')
              });
            } else {
              setManualLocation(true);
            }
          } else {
            setManualLocation(true);
          }
        } catch (exifError) {
          console.log('No EXIF data found or error reading EXIF:', exifError);
          setManualLocation(true);
        }

        // Process all images
        const processedFiles: File[] = [];
        const previews: string[] = [];
        
        for (const file of imageFiles) {
          // Compress image if needed
          const maxSize = 3 * 1024 * 1024; // 3MB
          let processedFile = file;
          
          if (file.size > maxSize) {
            const options = {
              maxSizeMB: 3,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              fileType: file.type,
            };
            
            try {
              processedFile = await imageCompression(file, options);
            } catch (compressionError) {
              console.error('Compression error:', compressionError);
            }
          }
          
          processedFiles.push(processedFile);
          
          // Create preview
          const preview = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(processedFile);
          });
          previews.push(preview);
        }
        
        setPhotos(prev => [...prev, ...processedFiles]);
        setPhotoPreviews(prev => [...prev, ...previews]);
        
        if (processedFiles.length > 1) {
          toast({
            title: t('Foto\'s toegevoegd!', 'Photos added!'),
            description: t(`${processedFiles.length} foto's geselecteerd`, `${processedFiles.length} photos selected`)
          });
        }
        
      } catch (error) {
        console.error('Error processing photos:', error);
        toast({
          title: t('Fout bij verwerken foto\'s', 'Error processing photos'),
          description: String(error),
          variant: 'destructive',
        });
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };


  useEffect(() => {
    // Only initialize if uploadType is set AND we don't have a map yet
    if (!mapContainer.current || map.current) return;
    if (!uploadType) return;

    // Load Leaflet lazily and initialize map
    const initMap = async () => {
      const leaflet = await loadLeaflet();
      
      if (!mapContainer.current || map.current) return;
      
      // Initialize map at default location (Amsterdam)
      map.current = leaflet.map(mapContainer.current).setView([52.3676, 4.9041], 7);

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map.current);

      // Add click handler to place marker (only if location is not locked)
      map.current.on('click', (e: L.LeafletMouseEvent) => {
        if (!map.current) return;
        
        // Don't allow location changes if locked
        if (locationLocked) {
          toast({ 
            title: t('Locatie vastgezet', 'Location locked'), 
            description: t('Voor voorgeselecteerde kunstwerken kan de locatie niet worden gewijzigd', 'Location cannot be changed for preselected artworks'),
            variant: 'default'
          });
          return;
        }

        // Remove existing marker if any
        if (marker.current) {
          marker.current.remove();
        }

        // Add new marker
        marker.current = leaflet.marker(e.latlng).addTo(map.current);
        
        // Update coordinates
        setLatitude(e.latlng.lat);
        setLongitude(e.latlng.lng);
        
        toast({ title: t('Locatie geselecteerd!', 'Location selected!') });
      });
      
      setMapReady(true);
    };

    initMap();

    return () => {
      map.current?.remove();
      map.current = null;
      setMapReady(false);
    };
  }, [uploadType, manualLocation, toast, selectedKunstwerk]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Photo is required for photo-only uploads, but optional for 3D model uploads
    if (uploadType === 'photo' && photos.length === 0) {
      toast({ title: t('Selecteer minstens één foto', 'Select at least one photo'), variant: 'destructive' });
      return;
    }
    
    if (uploadType === 'model' && !file) {
      toast({ title: t('Selecteer een 3D model bestand', 'Select a 3D model file'), variant: 'destructive' });
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
      infoLink: infoLink || undefined,
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

      const photoFileNames: string[] = [];

      // Upload all photos
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const photoExt = photo.name.split('.').pop();
        const photoFileName = `${user.id}/${Date.now()}_photo_${i}.${photoExt}`;
        
        const { error: photoUploadError } = await supabase.storage
          .from('model-thumbnails')
          .upload(photoFileName, photo);

        if (photoUploadError) throw photoUploadError;
        photoFileNames.push(photoFileName);
      }

      if (uploadType === 'model') {
        // Check if we're updating an existing kunstwerk
        if (selectedKunstwerk) {
          // Find matching model in database based on location
          const { data: existingModels } = await supabase
            .from('models')
            .select('*')
            .eq('latitude', validationResult.data.latitude)
            .eq('longitude', validationResult.data.longitude);
          
          if (existingModels && existingModels.length > 0) {
            // Upload 3D model file
            const fileExt = file!.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('models')
              .upload(fileName, file!);

            if (uploadError) throw uploadError;

            // Set the uploaded file paths and trigger thumbnail generation
            setUploadedFilePath(fileName);
            setUploadedPhotoPaths(photoFileNames);
            setGenerateThumbnail(true);
            return; // handleThumbnailGenerated will handle the update
          }
        }
        
        // New model upload
        const fileExt = file!.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('models')
          .upload(fileName, file!);

        if (uploadError) throw uploadError;

        setUploadedFilePath(fileName);
        setUploadedPhotoPaths(photoFileNames);
        setGenerateThumbnail(true);
      } else {
        // Photo only upload - use first photo as main
        const mainPhotoFileName = photoFileNames[0];
        const { data: { publicUrl: photoUrl } } = supabase.storage
          .from('model-thumbnails')
          .getPublicUrl(mainPhotoFileName);

        // Check if we're updating an existing kunstwerk
        if (selectedKunstwerk) {
          const { data: existingModels } = await supabase
            .from('models')
            .select('*')
            .eq('latitude', validationResult.data.latitude)
            .eq('longitude', validationResult.data.longitude);
          
          if (existingModels && existingModels.length > 0) {
            // Update existing model
            const { error: updateError } = await supabase
              .from('models')
              .update({
                photo_url: photoUrl,
                thumbnail_url: photoUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingModels[0].id);

            if (updateError) throw updateError;

            toast({ title: t('Foto toegevoegd aan bestaand kunstwerk!', 'Photo added to existing artwork!') });
            navigate('/');
            setLoading(false);
            return;
          }
        }

        // New photo upload
        const { error: dbError } = await supabase
          .from('models')
          .insert({
            user_id: user.id,
            name: validationResult.data.name,
            description: validationResult.data.description || null,
            file_path: '', // No 3D model for photo-only uploads
            latitude: validationResult.data.latitude,
            longitude: validationResult.data.longitude,
            thumbnail_url: photoUrl,
            photo_url: photoUrl,
          });

        if (dbError) throw dbError;

        toast({ title: t('Foto geüpload!', 'Photo uploaded!') });
        navigate('/');
        setLoading(false);
      }
    } catch (error) {
      const safeMessage = error instanceof Error && 'code' in error && error.code === '23514' 
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

      // Get public URLs
      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from('model-thumbnails')
        .getPublicUrl(thumbnailFileName);
      
      // Get photo URL if photos were uploaded (use first photo as main)
      let photoUrl: string | null = null;
      if (uploadedPhotoPaths.length > 0) {
        const { data: { publicUrl } } = supabase.storage
          .from('model-thumbnails')
          .getPublicUrl(uploadedPhotoPaths[0]);
        photoUrl = publicUrl;
      }

      // Validate input data again for DB insert
      const validationResult = modelSchema.safeParse({
        name,
        description: description || undefined,
        infoLink: infoLink || undefined,
        latitude,
        longitude,
      });

      if (!validationResult.success) {
        throw new Error(t('Validatiefout', 'Validation error'));
      }

      // Check if updating existing kunstwerk
      if (selectedKunstwerk) {
        const { data: existingModels } = await supabase
          .from('models')
          .select('*')
          .eq('latitude', validationResult.data.latitude)
          .eq('longitude', validationResult.data.longitude);
        
        if (existingModels && existingModels.length > 0) {
          // Update existing model
          const { error: updateError } = await supabase
            .from('models')
            .update({
              file_path: uploadedFilePath,
              thumbnail_url: thumbnailUrl,
              photo_url: photoUrl || existingModels[0].photo_url,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingModels[0].id);

          if (updateError) throw updateError;

          toast({ title: t('3D model toegevoegd aan bestaand kunstwerk!', '3D model added to existing artwork!') });
          navigate('/');
          setLoading(false);
          return;
        }
      }

      // Insert new model with thumbnail and photo URLs
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
    } catch (error) {
      const safeMessage = error instanceof Error && 'code' in error && error.code === '23514' 
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

        {!uploadType ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-6 w-6" />
                {t('Wat wil je uploaden?', 'What do you want to upload?')}
              </CardTitle>
              <CardDescription>{t('Kies tussen een foto of een 3D model', 'Choose between a photo or a 3D model')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setUploadType('photo')} 
                className="w-full h-24 text-lg"
                variant="outline"
              >
                <ImageIcon className="mr-2 h-6 w-6" />
                {t('Foto Uploaden', 'Upload Photo')}
              </Button>
              <Button 
                onClick={() => setUploadType('model')} 
                className="w-full h-24 text-lg"
                variant="outline"
              >
                <UploadIcon className="mr-2 h-6 w-6" />
                {t('3D Model Uploaden', 'Upload 3D Model')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {uploadType === 'photo' ? <ImageIcon className="h-6 w-6" /> : <UploadIcon className="h-6 w-6" />}
                {uploadType === 'photo' 
                  ? t('Foto Uploaden', 'Upload Photo')
                  : t('3D Model Uploaden', 'Upload 3D Model')
                }
              </CardTitle>
              <CardDescription>
                {uploadType === 'photo'
                  ? t('Upload een foto van een standbeeld', 'Upload a photo of a statue')
                  : t('Upload je eigen .stl 3D model met beschrijving', 'Upload your own .stl 3D model with description')
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kunstwerk">{t('Koppel aan bestaand kunstwerk (optioneel)', 'Link to existing artwork (optional)')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !selectedKunstwerk && "text-muted-foreground"
                      )}
                    >
                      {selectedKunstwerk 
                        ? (() => {
                            let kunstwerk;
                            if (selectedKunstwerk.city === 'nijmegen') {
                              kunstwerk = nijmegenKunstwerken.find(k => k.id === selectedKunstwerk.id);
                            } else if (selectedKunstwerk.city === 'utrecht') {
                              kunstwerk = utrechtKunstwerken.find(k => k.id === selectedKunstwerk.id);
                            } else if (selectedKunstwerk.city === 'alkmaar') {
                              kunstwerk = alkmaartKunstwerken.find(k => k.id === selectedKunstwerk.id);
                            } else {
                              kunstwerk = denhaagKunstwerken.find(k => k.id === selectedKunstwerk.id);
                            }
                            return kunstwerk ? `${kunstwerk.name} - ${kunstwerk.artist}` : t('Selecteer een kunstwerk...', 'Select an artwork...');
                          })()
                        : t('Selecteer een kunstwerk...', 'Select an artwork...')
                      }
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('Zoek kunstwerk...', 'Search artwork...')} />
                      <CommandList>
                        <CommandEmpty>{t('Geen kunstwerk gevonden.', 'No artwork found.')}</CommandEmpty>
                        <CommandGroup heading={t('Geen - nieuwe locatie', 'None - new location')}>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setSelectedKunstwerk(null);
                              setName('');
                              setDescription('');
                              setLatitude(null);
                              setLongitude(null);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !selectedKunstwerk ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {t('Geen - nieuwe locatie', 'None - new location')}
                          </CommandItem>
                        </CommandGroup>
                        <CommandGroup heading="Nijmegen">
                          {nijmegenKunstwerken.map(kunstwerk => (
                            <CommandItem
                              key={`nijmegen-${kunstwerk.id}`}
                              value={`nijmegen-${kunstwerk.id} ${kunstwerk.name} ${kunstwerk.artist}`}
                              onSelect={() => {
                                setSelectedKunstwerk({ id: kunstwerk.id, city: 'nijmegen' });
                                setName(kunstwerk.name);
                                setDescription(kunstwerk.description || '');
                                setLatitude(kunstwerk.lat);
                                setLongitude(kunstwerk.lon);
                                setManualLocation(true);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedKunstwerk?.city === 'nijmegen' && selectedKunstwerk?.id === kunstwerk.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {kunstwerk.name} - {kunstwerk.artist}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="Utrecht">
                          {utrechtKunstwerken.map(kunstwerk => (
                            <CommandItem
                              key={`utrecht-${kunstwerk.id}`}
                              value={`utrecht-${kunstwerk.id} ${kunstwerk.name} ${kunstwerk.artist}`}
                              onSelect={() => {
                                setSelectedKunstwerk({ id: kunstwerk.id, city: 'utrecht' });
                                setName(kunstwerk.name);
                                setDescription(kunstwerk.description || '');
                                setLatitude(kunstwerk.lat);
                                setLongitude(kunstwerk.lon);
                                setManualLocation(true);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedKunstwerk?.city === 'utrecht' && selectedKunstwerk?.id === kunstwerk.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {kunstwerk.name} - {kunstwerk.artist}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="Alkmaar">
                          {alkmaartKunstwerken.map(kunstwerk => (
                            <CommandItem
                              key={`alkmaar-${kunstwerk.id}`}
                              value={`alkmaar-${kunstwerk.id} ${kunstwerk.name} ${kunstwerk.artist}`}
                              onSelect={() => {
                                setSelectedKunstwerk({ id: kunstwerk.id, city: 'alkmaar' });
                                setName(kunstwerk.name);
                                setDescription(kunstwerk.description || '');
                                setLatitude(kunstwerk.lat);
                                setLongitude(kunstwerk.lon);
                                setManualLocation(true);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedKunstwerk?.city === 'alkmaar' && selectedKunstwerk?.id === kunstwerk.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {kunstwerk.name} - {kunstwerk.artist}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="Den Haag">
                          {denhaagKunstwerken.map(kunstwerk => (
                            <CommandItem
                              key={`denhaag-${kunstwerk.id}`}
                              value={`denhaag-${kunstwerk.id} ${kunstwerk.name} ${kunstwerk.artist}`}
                              onSelect={() => {
                                setSelectedKunstwerk({ id: kunstwerk.id, city: 'denhaag' });
                                setName(kunstwerk.name);
                                setDescription(kunstwerk.description || '');
                                setLatitude(kunstwerk.lat);
                                setLongitude(kunstwerk.lon);
                                setManualLocation(true);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedKunstwerk?.city === 'denhaag' && selectedKunstwerk?.id === kunstwerk.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {kunstwerk.name} - {kunstwerk.artist}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  {t('Upload een foto of model voor een bestaand kunstwerk uit Nijmegen, Utrecht, Alkmaar of Den Haag', 'Upload a photo or model for an existing artwork from Nijmegen, Utrecht, Alkmaar or Den Haag')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  <RequiredLabel>{t('Naam', 'Name')}</RequiredLabel>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('Bijv: Standbeeld Centrum', 'E.g: City Center Statue')}
                  required
                  disabled={!!selectedKunstwerk || isMunicipalArtwork}
                  className={(selectedKunstwerk || isMunicipalArtwork) ? "bg-muted cursor-not-allowed" : ""}
                />
                {(selectedKunstwerk || isMunicipalArtwork) && (
                  <p className="text-xs text-muted-foreground">
                    {t('Naam is vastgezet voor dit kunstwerk', 'Name is locked for this artwork')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  <RequiredLabel required={false}>{t('Beschrijving', 'Description')}</RequiredLabel>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('Beschrijf je model...', 'Describe your model...')}
                  rows={4}
                  disabled={!!selectedKunstwerk || isMunicipalArtwork}
                  className={(selectedKunstwerk || isMunicipalArtwork) ? "bg-muted cursor-not-allowed" : ""}
                />
                {(selectedKunstwerk || isMunicipalArtwork) && (
                  <p className="text-xs text-muted-foreground">
                    {t('Beschrijving is vastgezet voor dit kunstwerk', 'Description is locked for this artwork')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="infoLink" className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  <RequiredLabel required={false}>{t('Link naar meer informatie', 'Link to more information')}</RequiredLabel>
                </Label>
                <Input
                  id="infoLink"
                  type="url"
                  value={infoLink}
                  onChange={(e) => setInfoLink(e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  {t('Optioneel: voeg een link toe naar een website met meer informatie over dit kunstwerk', 'Optional: add a link to a website with more information about this artwork')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <RequiredLabel required={uploadType === 'photo'}>
                    {uploadType === 'photo' 
                      ? t('Foto\'s van het standbeeld', 'Photos of the statue')
                      : t('Foto\'s van het standbeeld', 'Photos of the statue')
                    }
                  </RequiredLabel>
                </Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                />
                {photoPreviews.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`} 
                          className="h-24 w-24 rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('Je kunt meerdere foto\'s selecteren. Als je foto locatiegegevens bevat, wordt de locatie automatisch ingevuld', 'You can select multiple photos. If your photo contains location data, the location will be filled automatically')}
                </p>
              </div>

              {uploadType === 'model' && (
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
              )}

              {uploadType === 'model' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <RequiredLabel>{t('Locatie (klik op de kaart of upload foto met GPS-data)', 'Location (click on the map or upload photo with GPS data)')}</RequiredLabel>
                  </Label>
                  <div 
                    ref={mapContainer} 
                    className={cn(
                      "h-64 w-full rounded-md border relative",
                      (selectedKunstwerk || locationLocked) && "opacity-80"
                    )}
                  >
                    {!mapReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                        <p className="text-sm text-muted-foreground">{t('Kaart laden...', 'Loading map...')}</p>
                      </div>
                    )}
                    {(selectedKunstwerk || locationLocked) && (
                      <div className="absolute inset-0 bg-muted/30 pointer-events-none z-[1000] flex items-center justify-center">
                        <div className="bg-background/90 px-4 py-2 rounded-md shadow-lg">
                          <p className="text-sm font-medium">📍 {t('Locatie vastgezet', 'Location locked')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {latitude !== null && longitude !== null && (
                    <a
                      href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      {t('Geselecteerd:', 'Selected:')} {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                      <MapPin className="h-3 w-3" />
                    </a>
                  )}
                  {(selectedKunstwerk || locationLocked) && (
                    <p className="text-xs text-muted-foreground">
                      {t('Locatie is vastgezet voor dit kunstwerk', 'Location is locked for this artwork')}
                    </p>
                  )}
                </div>
              )}
              
              {uploadType === 'photo' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <RequiredLabel>{t('Locatie', 'Location')}</RequiredLabel>
                  </Label>
                  {!manualLocation && latitude && longitude && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg mb-2">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✓ {t('Locatie automatisch gevonden uit foto', 'Location automatically found from photo')}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('Klik op de kaart om een locatie te selecteren', 'Click on the map to select a location')}
                  </p>
                  <div 
                    ref={mapContainer} 
                    className={cn(
                      "h-64 w-full rounded-md border relative",
                      (selectedKunstwerk || locationLocked) && "opacity-80"
                    )}
                  >
                    {!mapReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                        <p className="text-sm text-muted-foreground">{t('Kaart laden...', 'Loading map...')}</p>
                      </div>
                    )}
                    {(selectedKunstwerk || locationLocked) && (
                      <div className="absolute inset-0 bg-muted/30 pointer-events-none z-[1000] flex items-center justify-center">
                        <div className="bg-background/90 px-4 py-2 rounded-md shadow-lg">
                          <p className="text-sm font-medium">📍 {t('Locatie vastgezet', 'Location locked')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {latitude !== null && longitude !== null && (
                    <a
                      href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      {t('Geselecteerd:', 'Selected:')} {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                      <MapPin className="h-3 w-3" />
                    </a>
                  )}
                  {selectedKunstwerk && (
                    <p className="text-xs text-muted-foreground">
                      {t('Locatie is vastgezet voor dit kunstwerk', 'Location is locked for this artwork')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setUploadType(null);
                    setFile(null);
                    setPhotos([]);
                    setPhotoPreviews([]);
                    setName('');
                    setDescription('');
                    setInfoLink('');
                  }}
                  className="w-1/3"
                >
                  {t('Terug', 'Back')}
                </Button>
                <Button type="submit" className="w-2/3" disabled={loading}>
                  {uploadType === 'photo'
                    ? t(loading ? 'Uploaden...' : 'Upload Foto', loading ? 'Uploading...' : 'Upload Photo')
                    : t(loading ? 'Uploaden...' : 'Upload Model', loading ? 'Uploading...' : 'Upload Model')
                  }
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
};

export default Upload;
