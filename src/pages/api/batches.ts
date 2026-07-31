import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

// GET: Fetch all batches
export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching batches:', error);
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
    console.error('Unexpected error in batches GET API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST: Add a new batch
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { batch_name, student_count } = body;

    if (!batch_name || !student_count) {
      return new Response(
        JSON.stringify({ success: false, error: 'Batch name and student count are required fields.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('batches')
      .insert({
        batch_name,
        student_count: parseInt(student_count)
      })
      .select();

    if (error) {
      console.error('Error inserting batch:', error);
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
    console.error('Unexpected error in batches POST API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE: Remove a batch by id
export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Batch ID parameter is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Error deleting batch:', error);
      
      let friendlyMessage = error.message;
      if (error.code === '23503') {
        friendlyMessage = 'Cannot delete batch as it is assigned in the active schedule. Reset the timetable first.';
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
    console.error('Unexpected error in batches DELETE API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
