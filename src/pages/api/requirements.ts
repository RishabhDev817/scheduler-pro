import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const requirementsPath = path.join(process.cwd(), 'requirements.json');

// Helper to check if file exists and read it
function readRequirements() {
  try {
    if (fs.existsSync(requirementsPath)) {
      const data = fs.readFileSync(requirementsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read requirements.json:', e);
  }
  return null;
}

// GET: Retrieve all active scheduling requirements
export const GET: APIRoute = async () => {
  try {
    let reqs = readRequirements();
    
    // Seed requirements if the file doesn't exist or is empty
    if (!reqs || !Array.isArray(reqs) || reqs.length === 0) {
      console.log('Seeding initial requirements from active database entities...');
      
      const [profRes, subjRes, batchRes, roomRes] = await Promise.all([
        supabase.from('professors').select('id, department'),
        supabase.from('subjects').select('id, subject_name, required_room_type'),
        supabase.from('batches').select('id, batch_name'),
        supabase.from('rooms').select('id, room_number, room_type')
      ]);

      const professors = profRes.data || [];
      const subjects = subjRes.data || [];
      const batches = batchRes.data || [];
      const rooms = roomRes.data || [];

      reqs = [];

      if (professors.length > 0 && subjects.length > 0 && batches.length > 0) {
        // Find subject rooms mapping helper
        const getEligibleRooms = (roomType: string) => {
          const eligible = rooms.filter(r => r.room_type === roomType).map(r => r.id);
          // If no rooms match the exact room type, fallback to all rooms
          return eligible.length > 0 ? eligible : rooms.map(r => r.id);
        };

        // Create standard seeded requirements based on original schedule settings
        // Subject 1: Data Structures in C++ (Lecture Hall)
        // Subject 2: AI & Neural Networks Lab (AI/ML Lab)
        // Subject 3: DBMS (Standard Classroom / Lecture Hall)

        const ds = subjects.find(s => s.subject_name.includes('Structures') || s.id === 1);
        const ai = subjects.find(s => s.subject_name.includes('AI') || s.id === 2);
        const dbms = subjects.find(s => s.subject_name.includes('DBMS') || s.id === 3);

        const bca1 = batches.find(b => b.batch_name.includes('1st') || b.id === 1);
        const bca2 = batches.find(b => b.batch_name.includes('2nd') || b.id === 2);

        // Find qualified professors
        const dsProfs = professors.filter(p => p.department.includes('Computer') || p.id === 1 || p.id === 3);
        const aiProfs = professors.filter(p => p.department.includes('AI') || p.id === 2);

        const prof1Id = dsProfs[0]?.id || professors[0]?.id;
        const prof2Id = aiProfs[0]?.id || professors[0]?.id;
        const prof3Id = dsProfs[1]?.id || dsProfs[0]?.id || professors[0]?.id;

        // BCA 1st Year DS requirement (Dr. Sharma/Kumar -> 3 lectures/week)
        if (bca1 && ds && prof1Id) {
          reqs.push({
            id: `req_${Date.now()}_1`,
            professorId: prof1Id,
            subjectId: ds.id,
            batchId: bca1.id,
            lecturesPerWeek: 3,
            eligibleRoomIds: getEligibleRooms(ds.required_room_type)
          });
        }

        // BCA 1st Year DBMS requirement (Dr. Sharma/Kumar -> 3 lectures/week)
        if (bca1 && dbms && prof3Id) {
          reqs.push({
            id: `req_${Date.now()}_2`,
            professorId: prof3Id,
            subjectId: dbms.id,
            batchId: bca1.id,
            lecturesPerWeek: 3,
            eligibleRoomIds: getEligibleRooms(dbms.required_room_type)
          });
        }

        // BCA 2nd Year (AI) DS requirement (Dr. Sharma/Kumar -> 2 lectures/week)
        if (bca2 && ds && prof1Id) {
          reqs.push({
            id: `req_${Date.now()}_3`,
            professorId: prof1Id,
            subjectId: ds.id,
            batchId: bca2.id,
            lecturesPerWeek: 2,
            eligibleRoomIds: getEligibleRooms(ds.required_room_type)
          });
        }

        // BCA 2nd Year (AI) AI Lab requirement (Prof. Sneha -> 3 lectures/week)
        if (bca2 && ai && prof2Id) {
          reqs.push({
            id: `req_${Date.now()}_4`,
            professorId: prof2Id,
            subjectId: ai.id,
            batchId: bca2.id,
            lecturesPerWeek: 3,
            eligibleRoomIds: getEligibleRooms(ai.required_room_type)
          });
        }

        // BCA 2nd Year (AI) DBMS requirement (Dr. Sharma/Kumar -> 2 lectures/week)
        if (bca2 && dbms && prof3Id) {
          reqs.push({
            id: `req_${Date.now()}_5`,
            professorId: prof3Id,
            subjectId: dbms.id,
            batchId: bca2.id,
            lecturesPerWeek: 2,
            eligibleRoomIds: getEligibleRooms(dbms.required_room_type)
          });
        }
      }

      // Save seeded requirements array
      fs.writeFileSync(requirementsPath, JSON.stringify(reqs, null, 2), 'utf8');
    }

    return new Response(
      JSON.stringify({ success: true, requirements: reqs }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in requirements GET API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST: Save updated scheduling requirements
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { requirements } = body;

    if (!requirements || !Array.isArray(requirements)) {
      return new Response(
        JSON.stringify({ success: false, error: 'requirements must be an array.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Write to requirements.json
    fs.writeFileSync(requirementsPath, JSON.stringify(requirements, null, 2), 'utf8');

    return new Response(
      JSON.stringify({ success: true, requirements }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in requirements POST API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
