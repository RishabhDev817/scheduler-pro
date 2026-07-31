import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

// PUT: Update an existing timetable slot
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, day_of_week, time_slot, room_id, professor_id, subject_id, batch_id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Timetable entry ID is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updates: any = {};
    if (day_of_week !== undefined) updates.day_of_week = day_of_week;
    if (time_slot !== undefined) updates.time_slot = time_slot;
    if (room_id !== undefined) updates.room_id = room_id ? parseInt(room_id) : null;
    if (professor_id !== undefined) updates.professor_id = professor_id ? parseInt(professor_id) : null;
    if (subject_id !== undefined) updates.subject_id = subject_id ? parseInt(subject_id) : null;
    if (batch_id !== undefined) updates.batch_id = batch_id ? parseInt(batch_id) : null;

    const { data, error } = await supabase
      .from('master_timetable')
      .update(updates)
      .eq('id', parseInt(id))
      .select();

    if (error) {
      console.error('Error updating timetable entry:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: data?.[0] }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in timetable PUT API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE: Delete a timetable slot
export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Timetable entry ID parameter is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('master_timetable')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Error deleting timetable entry:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in timetable DELETE API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
