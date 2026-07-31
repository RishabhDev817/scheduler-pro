import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

// GET: Fetch all professors
export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('professors')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching professors:', error);
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
    console.error('Unexpected error in professors GET API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST: Add a new professor
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { full_name, email, department, max_weekly_hours } = body;

    if (!full_name || !email || !department) {
      return new Response(
        JSON.stringify({ success: false, error: 'Full name, email, and department are required fields.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('professors')
      .insert({
        full_name,
        email,
        department,
        max_weekly_hours: max_weekly_hours ? parseInt(max_weekly_hours) : 18
      })
      .select();

    if (error) {
      console.error('Error inserting professor:', error);
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
    console.error('Unexpected error in professors POST API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE: Remove a professor by id
export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Professor ID parameter is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('professors')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Error deleting professor:', error);
      
      // Check if it's a foreign key constraint violation
      let friendlyMessage = error.message;
      if (error.code === '23503') {
        friendlyMessage = 'Cannot delete professor as they are assigned in the active schedule. Reset the timetable first.';
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
    console.error('Unexpected error in professors DELETE API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
