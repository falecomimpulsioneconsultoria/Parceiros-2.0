import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);

async function runTest() {
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  const partnerId = profiles?.[0]?.id;

  const { data, error } = await supabase.from('leads').insert([{
    name: 'Test Final Lead',
    email: 'test.final@example.com',
    status: 'Lead',
    partner_id: partnerId
  }]);

  console.log('Error:', JSON.stringify(error, null, 2));
}

runTest();
