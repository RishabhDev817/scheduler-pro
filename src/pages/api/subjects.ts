import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

// GET: Fetch all subjects
export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching subjects:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in subjects GET API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST: Add a new subject
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { subject_name, required_room_type } = body;

    if (!subject_name || !required_room_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Subject name and required room type are required fields.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        subject_name,
        required_room_type
      })
      .select();

    if (error) {
      console.error('Error inserting subject:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: data?.[0] }), 
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in subjects POST API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE: Remove a subject by id
export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Subject ID parameter is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Error deleting subject:', error);
      
      let friendlyMessage = error.message;
      if (error.code === '23503') {
        friendlyMessage = 'Cannot delete subject as it is assigned in the active schedule. Reset the timetable first.';
      }

      return new Response(
        JSON.stringify({ success: false, error: friendlyMessage, code: error.code }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in subjects DELETE API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
