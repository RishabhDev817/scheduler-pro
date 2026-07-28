import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

// Endpoint queries the database at build time (static rendering) by default

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('professors')
      .select('*');

    if (error) {
      console.error('Error fetching professors via API route:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }), 
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Log the retrieved faculty members to the console as requested
    console.log('API Route query successful. Faculty members:', data);

    return new Response(
      JSON.stringify({ success: true, data }), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    console.error('Unexpected error in professors API route:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
