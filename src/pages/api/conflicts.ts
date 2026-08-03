import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

export const prerender = false;

const conflictsPath = path.join(process.cwd(), 'conflicts.json');

// GET: Retrieve the latest conflict metrics
export const GET: APIRoute = async () => {
  try {
    let conflictsData = { conflictsCount: 0, details: [] };
    
    if (fs.existsSync(conflictsPath)) {
      const fileContent = fs.readFileSync(conflictsPath, 'utf8');
      conflictsData = JSON.parse(fileContent);
    }
    
    return new Response(
      JSON.stringify({ success: true, ...conflictsData }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error reading conflicts file:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
