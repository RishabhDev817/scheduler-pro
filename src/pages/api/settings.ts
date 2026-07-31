import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

export const prerender = false;

const settingsPath = path.join(process.cwd(), 'settings.json');

const defaultSettings = {
  activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  totalSlots: 4,
  breakSlot: "Slot 4"
};

// Helper to read settings
function getSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed reading settings.json:', e);
  }
  return defaultSettings;
}

// GET: Retrieve current settings
export const GET: APIRoute = async () => {
  const settings = getSettings();
  return new Response(
    JSON.stringify({ success: true, settings }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// POST: Update settings
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { activeDays, totalSlots, breakSlot } = body;

    if (!activeDays || !Array.isArray(activeDays) || activeDays.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'activeDays must be a non-empty array of days.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const slotsInt = parseInt(totalSlots);
    if (isNaN(slotsInt) || slotsInt < 1 || slotsInt > 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'totalSlots must be a number between 1 and 10.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Write to settings.json
    const updatedSettings = {
      activeDays,
      totalSlots: slotsInt,
      breakSlot: breakSlot || null
    };

    fs.writeFileSync(settingsPath, JSON.stringify(updatedSettings, null, 2), 'utf8');

    return new Response(
      JSON.stringify({ success: true, settings: updatedSettings }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in settings POST API:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
