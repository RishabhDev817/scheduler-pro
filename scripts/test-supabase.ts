import { supabase } from '../src/lib/supabase';

async function testConnection() {
  console.log('Querying the professors table...');
  const { data, error } = await supabase
    .from('professors')
    .select('*');

  if (error) {
    console.error('Error connecting to Supabase or querying professors:', error);
    process.exit(1);
  }

  console.log('Successfully connected to Supabase!');
  console.log(`Retrieved ${data?.length || 0} professors:`);
  console.dir(data, { depth: null });
}

testConnection();
