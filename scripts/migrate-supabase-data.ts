import { supabase } from '../src/lib/supabase';

async function runMigration() {
  console.log('Starting Supabase database updates...');

  // 1. Update Batches
  const { data: batch1, error: e1 } = await supabase
    .from('batches')
    .update({ batch_name: 'BCA 1st year' })
    .eq('id', 1);
  if (e1) console.error('Error updating batch 1:', e1);
  else console.log('Successfully updated batch 1 to "BCA 1st year"');

  const { data: batch2, error: e2 } = await supabase
    .from('batches')
    .update({ batch_name: 'BCA 2nd yr - AI/ML' })
    .eq('id', 2);
  if (e2) console.error('Error updating batch 2:', e2);
  else console.log('Successfully updated batch 2 to "BCA 2nd yr - AI/ML"');

  // 2. Update Rooms
  const { data: room4, error: e3 } = await supabase
    .from('rooms')
    .update({ room_number: 'Lab-102' })
    .eq('id', 4);
  if (e3) console.error('Error updating room 4:', e3);
  else console.log('Successfully updated room 4 to "Lab-102"');

  // 3. Update Subjects
  const { data: subj2, error: e4 } = await supabase
    .from('subjects')
    .update({ subject_name: 'AI and neural networks lab' })
    .eq('id', 2);
  if (e4) console.error('Error updating subject 2:', e4);
  else console.log('Successfully updated subject 2 to "AI and neural networks lab"');

  const { data: subj3, error: e5 } = await supabase
    .from('subjects')
    .update({ subject_name: 'Database management systems' })
    .eq('id', 3);
  if (e5) console.error('Error updating subject 3:', e5);
  else console.log('Successfully updated subject 3 to "Database management systems"');

  console.log('Supabase database updates completed.');
}

runMigration();
