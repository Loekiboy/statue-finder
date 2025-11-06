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
import { ArrowLeft, Upload as UploadIcon, MapPin, Image as ImageIcon, Lock } from 'lucide-react';
import { z } from 'zod';
import { ThumbnailGenerator } from '@/components/ThumbnailGenerator';
import ExifReader from 'exifreader';
import imageCompression from 'browser-image-compression';
import type * as L from 'leaflet';
import { nijmegenKunstwerken } from '@/data/nijmegenKunstwerken';
import { utrechtKunstwerken } from '@/data/utrechtKunstwerken';
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
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const Upload = () => {
  const { t } = useLanguage();
  const [uploadType, setUploadType] = useState<'photo' | 'model' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [manualLocation, setManualLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generateThumbnail, setGenerateThumbnail] = useState(false);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string | null>(null);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [largeFileSize, setLargeFileSize] = useState<number>(0);
  const [mapReady, setMapReady] = useState(false);
  const [selectedKunstwerk, setSelectedKunstwerk] = useState<{id: string, city: 'nijmegen' | 'utrecht'} | null>(null);
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
        const { lat, lon, name: statueName } = JSON.parse(uploadLocationData);
        setLatitude(lat);
        setLongitude(lon);
        setName(statueName || '');
        setManualLocation(true);
        
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
              setManualLocation(false);
              
              // Update map marker if map is ready
              const updateMapMarker = async () => {
                const leaflet = await loadLeaflet();
                if (map.current) {
                  if (marker.current) {
                    marker.current.remove();
                  }
                  marker.current = leaflet.marker([lat, lon]).addTo(map.current);
                  map.current.setView([lat, lon], 15);
                }
              };
              
              if (mapReady) {
                updateMapMarker();
              }
              
              toast({ 
                title: t('Locatie gevonden!', 'Location found!'),
                description: t('Locatie is automatisch ingesteld uit de foto', 'Location was automatically set from the photo')
              });
            } else {
              setManualLocation(true);
            }
          } else {
            setManualLocation(true);
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
            fileType: selectedFile.type,
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
    // Only initialize if uploadType requires a map AND we don't have a map yet
    if (!mapContainer.current || map.current) return;
    if (!uploadType) return;
    if (uploadType === 'photo' && !manualLocation) return;

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

      // Add click handler to place marker (only if no kunstwerk is selected)
      map.current.on('click', (e: L.LeafletMouseEvent) => {
        if (!map.current) return;
        
        // Prevent location change if kunstwerk is preselected
        if (selectedKunstwerk) {
          toast({ 
            title: t('Locatie vergrendeld', 'Location locked'),
            description: t('De locatie is gekoppeld aan het geselecteerde kunstwerk en kan niet worden gewijzigd', 'The location is linked to the selected artwork and cannot be changed'),
            variant: 'destructive'
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
        
        toast({ title: 'Locatie geselecteerd!' });
      });
      
      setMapReady(true);
    };

    initMap();

    return () => {
      map.current?.remove();
      map.current = null;
      setMapReady(false);
    };
  }, [uploadType, manualLocation, toast, selectedKunstwerk, t]);

  // Update map marker when kunstwerk is selected and map is ready
  useEffect(() => {
    if (!selectedKunstwerk || !mapReady || latitude === null || longitude === null) return;
    
    const updateMapMarker = async () => {
      const leaflet = await loadLeaflet();
      if (map.current) {
        // Remove existing marker if any
        if (marker.current) {
          marker.current.remove();
        }
        
        // Add marker at kunstwerk location
        marker.current = leaflet.marker([latitude, longitude]).addTo(map.current);
        map.current.setView([latitude, longitude], 16);
      }
    };
    
    updateMapMarker();
  }, [selectedKunstwerk, mapReady, latitude, longitude]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Photo is required for photo-only uploads, but optional for 3D model uploads
    if (uploadType === 'photo' && !photo) {
      toast({ title: t('Selecteer een foto', 'Select a photo'), variant: 'destructive' });
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

      let photoFileName: string | null = null;

      // Upload photo if provided
      if (photo) {
        const photoExt = photo.name.split('.').pop();
        photoFileName = `${user.id}/${Date.now()}_photo.${photoExt}`;
        
        const { error: photoUploadError } = await supabase.storage
          .from('model-thumbnails')
          .upload(photoFileName, photo);

        if (photoUploadError) throw photoUploadError;
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
            // Update existing model instead of creating new one
            const existingModel = existingModels[0];
            
            // Upload 3D model file
            const fileExt = file!.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('models')
              .upload(fileName, file!);

            if (uploadError) throw uploadError;

            // Set the uploaded file paths and trigger thumbnail generation
            // We'll update instead of insert
            setUploadedFilePath(fileName);
            setUploadedPhotoPath(photoFileName);
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
        setUploadedPhotoPath(photoFileName);
        setGenerateThumbnail(true);
      } else {
        // Photo only upload
        const { data: { publicUrl: photoUrl } } = supabase.storage
          .from('model-thumbnails')
          .getPublicUrl(photoFileName!);

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
      
      // Get photo URL if photo was uploaded
      let photoUrl: string | null = null;
      if (uploadedPhotoPath) {
        const { data: { publicUrl } } = supabase.storage
          .from('model-thumbnails')
          .getPublicUrl(uploadedPhotoPath);
        photoUrl = publicUrl;
      }

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
                            const kunstwerk = selectedKunstwerk.city === 'nijmegen'
                              ? nijmegenKunstwerken.find(k => k.id === selectedKunstwerk.id)
                              : utrechtKunstwerken.find(k => k.id === selectedKunstwerk.id);
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
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  {t('Upload een foto of model voor een bestaand kunstwerk uit Amsterdam, Nijmegen of Utrecht', 'Upload a photo or model for an existing artwork from Amsterdam, Nijmegen or Utrecht')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t('Naam', 'Name')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('Bijv: Standbeeld Centrum', 'E.g: City Center Statue')}
                  required
                  disabled={!!selectedKunstwerk}
                  className={selectedKunstwerk ? 'bg-muted cursor-not-allowed' : ''}
                />
                {selectedKunstwerk && (
                  <p className="text-xs text-muted-foreground">
                    {t('Naam is gekoppeld aan het geselecteerde kunstwerk en kan niet worden gewijzigd', 'Name is linked to the selected artwork and cannot be changed')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('Beschrijving', 'Description')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('Beschrijf je model...', 'Describe your model...')}
                  rows={4}
                  disabled={!!selectedKunstwerk}
                  className={selectedKunstwerk ? 'bg-muted cursor-not-allowed' : ''}
                />
                {selectedKunstwerk && (
                  <p className="text-xs text-muted-foreground">
                    {t('Beschrijving is gekoppeld aan het geselecteerde kunstwerk en kan niet worden gewijzigd', 'Description is linked to the selected artwork and cannot be changed')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {uploadType === 'photo' 
                    ? t('Foto van het standbeeld', 'Photo of the statue') + ' *'
                    : t('Foto van het standbeeld (optioneel)', 'Photo of the statue (optional)')
                  }
                </Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  required={uploadType === 'photo'}
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
                    {t('Locatie (klik op de kaart of upload foto met GPS-data)', 'Location (click on the map or upload photo with GPS data)')}
                  </Label>
                  {selectedKunstwerk && (
                    <p className="text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                      <Lock className="h-4 w-4" aria-label={t('Vergrendeld', 'Locked')} />
                      {t('Locatie is vergrendeld en gekoppeld aan het geselecteerde kunstwerk', 'Location is locked and linked to the selected artwork')}
                    </p>
                  )}
                  <div 
                    ref={mapContainer} 
                    className={`h-64 w-full rounded-md border relative ${selectedKunstwerk ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {!mapReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                        <p className="text-sm text-muted-foreground">Kaart laden...</p>
                      </div>
                    )}
                  </div>
                  {latitude !== null && longitude !== null && (
                    <p className="text-sm text-muted-foreground">
                      {t('Geselecteerd:', 'Selected:')} {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                    </p>
                  )}
                </div>
              )}
              
              {uploadType === 'photo' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t('Locatie', 'Location')}
                  </Label>
                  {manualLocation ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('Klik op de kaart om een locatie te selecteren', 'Click on the map to select a location')}
                      </p>
                      <div 
                        ref={mapContainer} 
                        className="h-64 w-full rounded-md border relative"
                      >
                        {!mapReady && (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                            <p className="text-sm text-muted-foreground">Kaart laden...</p>
                          </div>
                        )}
                      </div>
                      {latitude !== null && longitude !== null && (
                        <p className="text-sm text-muted-foreground">
                          {t('Geselecteerd:', 'Selected:')} {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                        </p>
                      )}
                    </>
                  ) : (
                    latitude && longitude && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm">
                          📍 {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                        </p>
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setManualLocation(true)}
                        >
                          {t('Locatie handmatig kiezen', 'Choose location manually')}
                        </Button>
                      </div>
                    )
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
                    setPhoto(null);
                    setPhotoPreview(null);
                    setName('');
                    setDescription('');
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
