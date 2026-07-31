import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

// GET: Fetch all rooms
export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching rooms:', error);
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
    console.error('Unexpected error in rooms GET API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST: Add a new room
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { room_number, room_type, capacity } = body;

    if (!room_number || !room_type || !capacity) {
      return new Response(
        JSON.stringify({ success: false, error: 'Room number, type, and capacity are required fields.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_number,
        room_type,
        capacity: parseInt(capacity)
      })
      .select();

    if (error) {
      console.error('Error inserting room:', error);
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
    console.error('Unexpected error in rooms POST API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE: Remove a room by id
export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Room ID parameter is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Error deleting room:', error);
      
      let friendlyMessage = error.message;
      if (error.code === '23503') {
        friendlyMessage = 'Cannot delete room as it is assigned in the active schedule. Reset the timetable first.';
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
    console.error('Unexpected error in rooms DELETE API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
