// Crea i 4 utenti applicativi registrandoli via Supabase Auth (anon key).
// Usa la stessa identità derivata dell'app: email sintetica + password condivisa.
// Esegui dalla cartella app:  node scripts/seed-users.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const SHARED_PASSWORD = 'linea-eco-2026!';
const EMAIL_DOMAIN = 'preventivi-eco.com';
const slug = (u) =>
  u.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const emailFor = (u) => `${slug(u)}@${EMAIL_DOMAIN}`;

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const users = ['nunzio', 'paolo', 'andrea', 'paolo grassi'];

for (const name of users) {
  const email = emailFor(name);
  const { error } = await supabase.auth.signUp({
    email,
    password: SHARED_PASSWORD,
    options: { data: { display_name: name } },
  });
  if (error) {
    console.log(`✗ ${name.padEnd(14)} (${email}) → ${error.message}`);
  } else {
    console.log(`✓ ${name.padEnd(14)} (${email}) creato`);
  }
  await supabase.auth.signOut();
}
