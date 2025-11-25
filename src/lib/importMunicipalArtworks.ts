import { supabase } from '@/integrations/supabase/client';
import { nijmegenKunstwerken } from '@/data/nijmegenKunstwerken';
import { utrechtKunstwerken } from '@/data/utrechtKunstwerken';
import { alkmaartKunstwerken } from '@/data/alkmaartKunstwerken';
import { denhaagKunstwerken } from '@/data/denhaagKunstwerken';

export const importMunicipalArtworks = async () => {
  try {
    // Check if municipal artworks already exist
    const { data: existingArtworks, error: checkError } = await supabase
      .from('models')
      .select('source_id, source_city')
      .eq('is_municipal', true);

    if (checkError) throw checkError;

    const existingIds = new Set(
      existingArtworks?.map(a => `${a.source_city}-${a.source_id}`) || []
    );

    const artworksToImport = [];

    // Nijmegen artworks
    for (const artwork of nijmegenKunstwerken) {
      const uniqueId = `nijmegen-${artwork.id}`;
      if (!existingIds.has(uniqueId)) {
        artworksToImport.push({
          name: artwork.name,
          description: artwork.description || null,
          artist: artwork.artist,
          latitude: artwork.lat,
          longitude: artwork.lon,
          credits: artwork.credits || null,
          website_url: artwork.websiteUrl || null,
          source_city: 'nijmegen',
          source_id: artwork.id,
          is_municipal: true,
          file_path: '', // No 3D model yet
          user_id: '00000000-0000-0000-0000-000000000000', // System user
        });
      }
    }

    // Utrecht artworks
    for (const artwork of utrechtKunstwerken) {
      const uniqueId = `utrecht-${artwork.id}`;
      if (!existingIds.has(uniqueId)) {
        artworksToImport.push({
          name: artwork.name,
          description: artwork.description || null,
          artist: artwork.artist,
          latitude: artwork.lat,
          longitude: artwork.lon,
          year: artwork.year || null,
          materials: artwork.materials.join(', ') || null,
          photo_url: artwork.photos[0] || null,
          source_city: 'utrecht',
          source_id: artwork.id,
          is_municipal: true,
          file_path: '', // No 3D model yet
          user_id: '00000000-0000-0000-0000-000000000000',
        });
      }
    }

    // Alkmaar artworks
    for (const artwork of alkmaartKunstwerken) {
      const uniqueId = `alkmaar-${artwork.id}`;
      if (!existingIds.has(uniqueId)) {
        artworksToImport.push({
          name: artwork.name,
          description: artwork.description || null,
          artist: artwork.artist,
          latitude: artwork.lat,
          longitude: artwork.lon,
          year: artwork.year || null,
          materials: artwork.materials.join(', ') || null,
          photo_url: artwork.photos[0] || null,
          source_city: 'alkmaar',
          source_id: artwork.id,
          is_municipal: true,
          file_path: '', // No 3D model yet
          user_id: '00000000-0000-0000-0000-000000000000',
        });
      }
    }

    // Den Haag artworks
    for (const artwork of denhaagKunstwerken) {
      const uniqueId = `denhaag-${artwork.id}`;
      if (!existingIds.has(uniqueId)) {
        artworksToImport.push({
          name: artwork.name,
          description: artwork.description || null,
          artist: artwork.artist,
          latitude: artwork.lat,
          longitude: artwork.lon,
          year: artwork.year || null,
          materials: artwork.materials.join(', ') || null,
          photo_url: artwork.photos[0] || null,
          source_city: 'denhaag',
          source_id: artwork.id,
          is_municipal: true,
          file_path: '', // No 3D model yet
          user_id: '00000000-0000-0000-0000-000000000000',
        });
      }
    }

    // Import in batches
    if (artworksToImport.length > 0) {
      console.log(`Importing ${artworksToImport.length} municipal artworks...`);
      const { error: insertError } = await supabase
        .from('models')
        .insert(artworksToImport);

      if (insertError) throw insertError;
      console.log('Municipal artworks imported successfully');
    }

    return { success: true, imported: artworksToImport.length };
  } catch (error) {
    console.error('Error importing municipal artworks:', error);
    return { success: false, error };
  }
};

export const importDrentheArtworks = async () => {
  try {
    const response = await fetch('https://kaartportaal.drenthe.nl/server/rest/services/GDB_actueel/GBI_WK_KUNST_PROVWEGEN_P/MapServer/0/query?where=1%3D1&outFields=*&f=geojson');
    const data = await response.json();
    
    const { data: existingArtworks, error: checkError } = await supabase
      .from('models')
      .select('source_id, source_city')
      .eq('source_city', 'drenthe')
      .eq('is_municipal', true);

    if (checkError) throw checkError;

    const existingIds = new Set(
      existingArtworks?.map(a => a.source_id) || []
    );

    const artworksToImport = [];

    for (const feature of data.features) {
      const props = feature.properties;
      const sourceId = props.OBJECTID?.toString() || props.FID?.toString();
      
      if (sourceId && !existingIds.has(sourceId)) {
        const coords = feature.geometry.coordinates;
        artworksToImport.push({
          name: props.KUNSTWERK || props.NAAM || 'Onbekend kunstwerk',
          description: props.OMSCHRIJVING || props.BESCHRIJVING || null,
          artist: props.KUNSTENAAR || props.MAKER || 'Onbekende kunstenaar',
          latitude: coords[1],
          longitude: coords[0],
          year: props.JAAR?.toString() || props.BOUWJAAR?.toString() || null,
          materials: props.MATERIAAL || null,
          source_city: 'drenthe',
          source_id: sourceId,
          is_municipal: true,
          file_path: '',
          user_id: '00000000-0000-0000-0000-000000000000',
        });
      }
    }

    if (artworksToImport.length > 0) {
      console.log(`Importing ${artworksToImport.length} Drenthe artworks...`);
      const { error: insertError } = await supabase
        .from('models')
        .insert(artworksToImport);

      if (insertError) throw insertError;
      console.log('Drenthe artworks imported successfully');
    }

    return { success: true, imported: artworksToImport.length };
  } catch (error) {
    console.error('Error importing Drenthe artworks:', error);
    return { success: false, error };
  }
};
