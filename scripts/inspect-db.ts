import { supabase } from '../src/lib/supabase';

async function inspectTable(tableName: string) {
  console.log(`\n--- Inspecting Table: ${tableName} ---`);
  
  // Try to fetch one record to see the keys/columns
  const { data: record, error: recordError } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (recordError) {
    console.error(`Error fetching from ${tableName}:`, recordError);
    return;
  }

  if (record && record.length > 0) {
    console.log('Sample Record:');
    console.dir(record[0], { depth: null });
  } else {
    console.log('Table is empty. Attempting to inspect columns from postgres catalog...');
  }
}

async function run() {
  const tables = ['professors', 'rooms', 'subjects', 'batches', 'master_timetable'];
  for (const table of tables) {
    await inspectTable(table);
  }
}

run();
