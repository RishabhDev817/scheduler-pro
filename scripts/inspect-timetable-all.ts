import { supabase } from '../src/lib/supabase';

async function main() {
  const { data, error } = await supabase
    .from('master_timetable')
    .select(`
      day_of_week,
      time_slot,
      professors ( full_name ),
      rooms ( room_number ),
      subjects ( subject_name ),
      batches ( batch_name )
    `)
    .order('day_of_week')
    .order('time_slot');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`=== master_timetable (${data?.length} records) ===`);
  data.forEach((row: any) => {
    console.log(`${row.day_of_week} - ${row.time_slot}: ${row.subjects?.subject_name} for ${row.batches?.batch_name} in ${row.rooms?.room_number} by ${row.professors?.full_name}`);
  });
}

main();
