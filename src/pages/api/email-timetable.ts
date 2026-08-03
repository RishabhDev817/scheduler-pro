import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { professorIds } = await request.json();

    if (!Array.isArray(professorIds) || professorIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No professors selected.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch timetable data with full joins
    const { data: timetableData, error: dbError } = await supabase
      .from('master_timetable')
      .select(`
        *,
        professors(*),
        rooms(*),
        subjects(*),
        batches(*)
      `)
      .order('day_of_week')
      .order('time_slot');

    if (dbError) throw dbError;

    // 2. Setup Nodemailer transport
    const smtpServer = process.env.SMTP_SERVER;
    const smtpPort = process.env.SMTP_PORT;
    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpServer || !smtpEmail || !smtpPassword) {
      console.warn("SMTP settings missing in environment variables. Email notifications will fail.");
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SMTP server environment variables (SMTP_SERVER, SMTP_EMAIL, SMTP_PASSWORD) are not configured.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpServer,
      port: parseInt(smtpPort || '587', 10),
      secure: parseInt(smtpPort || '587', 10) === 465,
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });

    let sentCount = 0;
    let failedCount = 0;
    const failures: string[] = [];

    // Order of days for formatting
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    // 3. Dispatch emails
    for (const profId of professorIds) {
      // Find all slots for this professor
      const profSlots = (timetableData || []).filter(item => item.professor_id === profId);
      
      // If we don't have slots, we still need professor info. Let's query professor info or find it in slots
      let profName = '';
      let profEmailAddress = '';
      
      if (profSlots.length > 0) {
        profName = profSlots[0].professors?.full_name || 'Professor';
        profEmailAddress = profSlots[0].professors?.email;
      } else {
        // Query professor directly
        const { data: profData } = await supabase
          .from('professors')
          .select('full_name, email')
          .eq('id', profId)
          .single();
        if (profData) {
          profName = profData.full_name || 'Professor';
          profEmailAddress = profData.email;
        }
      }

      if (!profEmailAddress) {
        failedCount++;
        failures.push(`${profName} (no email configured)`);
        continue;
      }

      // Group slots by day
      const slotsByDay: Record<string, typeof profSlots> = {};
      profSlots.forEach(slot => {
        const day = slot.day_of_week || 'Unscheduled';
        if (!slotsByDay[day]) slotsByDay[day] = [];
        slotsByDay[day].push(slot);
      });

      // Format schedule text
      let scheduleText = `Hello ${profName},\n\n`;
      scheduleText += `Here is your weekly teaching schedule for SchedulerPro:\n\n`;

      const activeDays = Object.keys(slotsByDay).sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));

      if (activeDays.length > 0) {
        activeDays.forEach(day => {
          scheduleText += `${day}:\n`;
          // Sort slots by time
          const daySlots = slotsByDay[day].sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));
          daySlots.forEach(s => {
            const subject = s.subjects?.subject_name || 'Unknown Subject';
            const room = s.rooms?.room_number || 'Unknown Room';
            const batch = s.batches?.batch_name || 'Unknown Batch';
            scheduleText += `  - ${s.time_slot}: ${subject} (Batch: ${batch}, Room: ${room})\n`;
          });
          scheduleText += `\n`;
        });
      } else {
        scheduleText += `You have no teaching slots assigned for this week.\n\n`;
      }

      scheduleText += `Best regards,\nAcademic Registrar, SchedulerPro\n`;

      try {
        await transporter.sendMail({
          from: `"SchedulerPro Academic Registrar" <${smtpEmail}>`,
          to: profEmailAddress,
          subject: `[SchedulerPro] Your Weekly Teaching Schedule`,
          text: scheduleText,
        });
        sentCount++;
      } catch (sendErr: any) {
        console.error(`Failed to send email to ${profName} (${profEmailAddress}):`, sendErr);
        failedCount++;
        failures.push(`${profName} (${sendErr.message || 'SMTP Error'})`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        failedCount,
        failures
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error dispatching emails:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Unknown server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
