import { readFileSync } from 'node:fs';
for (const line of readFileSync('.env.local','utf8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false}});
const { data } = await sb.from('song_contents').select('chordpro').eq('slug','d-65').single();
console.log(data.chordpro);
