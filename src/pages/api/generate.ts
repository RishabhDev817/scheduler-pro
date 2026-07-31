import type { APIRoute } from 'astro';
import { exec } from 'child_process';
import path from 'path';

export const prerender = false;

export const POST: APIRoute = async () => {
  return new Promise((resolve) => {
    // Determine the absolute path to generate_schedule.py script
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_schedule.py');
    
    console.log(`Executing AI Scheduler solver script at: ${scriptPath}`);
    
    // We execute python3 scripts/generate_schedule.py
    exec(`python3 "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Execution error occurred running scheduler solver:', error);
        console.error('stderr output:', stderr);
        console.error('stdout output:', stdout);
        
        resolve(new Response(
          JSON.stringify({ 
            success: false, 
            error: stderr || error.message || 'Unknown error occurred.',
            log: stdout 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        ));
      } else {
        console.log('AI Scheduler solver completed successfully!');
        resolve(new Response(
          JSON.stringify({ 
            success: true, 
            log: stdout 
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));
      }
    });
  });
};
