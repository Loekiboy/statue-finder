import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Simplify model function called');
    
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        },
      );
    }

    console.log(`Authenticated user: ${user.id}`);
    
    const { file, fileName } = await req.json();
    
    if (!file || !fileName) {
      throw new Error('Missing file or fileName');
    }

    console.log(`Processing file: ${fileName}`);
    
    // Decode base64 file
    const fileData = Uint8Array.from(atob(file), c => c.charCodeAt(0));
    
    console.log(`Original file size: ${fileData.length} bytes`);
    
    // For STL files, we'll implement a simple vertex reduction algorithm
    // Parse STL binary format
    const littleEndian = true;
    const view = new DataView(fileData.buffer);
    
    // Skip header (80 bytes)
    let offset = 80;
    
    // Read number of triangles
    const numTriangles = view.getUint32(offset, littleEndian);
    offset += 4;
    
    console.log(`Original triangles: ${numTriangles}`);
    
    // Target: reduce to approximately 50% of triangles to get under 20MB
    const targetTriangles = Math.floor(numTriangles * 0.5);
    const step = Math.max(1, Math.floor(numTriangles / targetTriangles));
    
    console.log(`Target triangles: ${targetTriangles}, Step: ${step}`);
    
    // Create new STL with reduced triangles
    const newHeader = new Uint8Array(80);
    const headerText = 'Simplified STL by Lovable';
    for (let i = 0; i < headerText.length; i++) {
      newHeader[i] = headerText.charCodeAt(i);
    }
    
    const triangles: Uint8Array[] = [];
    let triangleCount = 0;
    
    // Read and select triangles
    for (let i = 0; i < numTriangles; i++) {
      const triangleData = new Uint8Array(50);
      const triangleView = new DataView(triangleData.buffer);
      
      // Read triangle data (normal + 3 vertices + attribute)
      for (let j = 0; j < 50; j++) {
        triangleData[j] = fileData[offset + j];
      }
      
      // Keep every nth triangle
      if (i % step === 0) {
        triangles.push(triangleData);
        triangleCount++;
      }
      
      offset += 50;
    }
    
    console.log(`New triangle count: ${triangleCount}`);
    
    // Build new STL file
    const newFileSize = 80 + 4 + (triangleCount * 50);
    const newFile = new Uint8Array(newFileSize);
    
    // Write header
    newFile.set(newHeader, 0);
    
    // Write triangle count
    const countView = new DataView(newFile.buffer, 80, 4);
    countView.setUint32(0, triangleCount, littleEndian);
    
    // Write triangles
    let writeOffset = 84;
    for (const triangle of triangles) {
      newFile.set(triangle, writeOffset);
      writeOffset += 50;
    }
    
    console.log(`New file size: ${newFile.length} bytes (${(newFile.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...newFile));
    
    return new Response(
      JSON.stringify({ 
        simplifiedModel: base64,
        originalSize: fileData.length,
        newSize: newFile.length,
        originalTriangles: numTriangles,
        newTriangles: triangleCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error simplifying model:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
