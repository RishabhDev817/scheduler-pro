import { supabase } from '../src/lib/supabase';

async function testJoin() {
  console.log('Testing join query in Supabase...');
  const { data, error } = await supabase
    .from('master_timetable')
    .select(`
      id,
      day_of_week,
      time_slot,
      professors ( id, full_name, email, department ),
      rooms ( id, room_number, room_type ),
      subjects ( id, subject_name, required_room_type ),
      batches ( id, batch_name )
    `);

  if (error) {
    console.error('Error fetching joined timetable data:', error);
  } else {
    console.log('Successfully fetched joined data!');
    console.dir(data?.[0], { depth: null });
  }
}

testJoin();
