import { supabase } from '../src/lib/supabase';

async function main() {
  const tables = ['professors', 'rooms', 'subjects', 'batches'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    console.log(`\n=== ${table.toUpperCase()} (${data?.length || 0} records) ===`);
    console.dir(data, { depth: null });
  }
}

main();
