import { supabase } from '../src/lib/supabase';

async function testInsert() {
  console.log('Attempting to insert a dummy record to trigger schema validation or get a response...');
  
  // Try inserting an empty object. If there are NOT NULL constraints, it will tell us which columns.
  // If it succeeds, we can see the inserted columns!
  const { data, error } = await supabase
    .from('master_timetable')
    .insert({ day_of_week: 'Monday', time_slot: 'Slot 1' })
    .select();

  if (error) {
    console.error('Error inserting dummy:', error);
  } else {
    console.log('Inserted dummy successfully, columns returned:', data);
    if (data && data.length > 0) {
      const deleteRes = await supabase.from('master_timetable').delete().eq('id', data[0].id);
      console.log('Cleaned up dummy record:', deleteRes.error ? deleteRes.error : 'Success');
    }
  }
}

testInsert();
