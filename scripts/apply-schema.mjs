// Applies supabase/schema.sql (and optionally seed.sql) to your Supabase project
// through the Supabase Management API, so you don't have to paste it into the
// SQL Editor by hand.
//
//   npm run db:apply            → runs supabase/schema.sql (safe to re-run)
//   npm run db:apply -- --seed  → also runs supabase/seed.sql (RESETS the demo products' price/stock)
//
// It needs ONE secret that is never committed: a Supabase personal access token.
//   1. https://supabase.com/dashboard/account/tokens → Generate new token
//   2. Put it in .env.local:   SUPABASE_ACCESS_TOKEN=sbp_...
//   3. Run the command, then DELETE the token on that same page.
// The project is taken from NEXT_PUBLIC_SUPABASE_URL. Nothing here prints the token.

import { existsSync, readFileSync } from 'node:fs';

class Failure extends Error {}

// Throwing (instead of process.exit) lets Node close the network handles cleanly;
// exiting right after a fetch crashes Node on Windows.
function fail(message) {
  throw new Failure(message);
}

function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[line.slice(0, eq).trim()] = value;
  }
  return out;
}

async function main() {
  const env = { ...loadEnvFile('.env.local'), ...process.env };
  const token = env.SUPABASE_ACCESS_TOKEN;
  const projectUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const withSeed = process.argv.includes('--seed');

  if (!projectUrl) fail('NEXT_PUBLIC_SUPABASE_URL is missing from .env.local, so I do not know which project to update.');
  if (!token) {
    fail(
      'SUPABASE_ACCESS_TOKEN is missing.\n' +
      '  1. Create one at https://supabase.com/dashboard/account/tokens\n' +
      '  2. Add this line to .env.local:   SUPABASE_ACCESS_TOKEN=sbp_...\n' +
      '  3. Run `npm run db:apply` again, then delete the token on the same page.',
    );
  }

  let ref;
  try {
    ref = new URL(projectUrl).hostname.split('.')[0];
  } catch {
    fail(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${projectUrl}`);
  }

  const files = ['supabase/schema.sql', ...(withSeed ? ['supabase/seed.sql'] : [])];
  console.log(`Project: ${ref}`);
  if (withSeed) console.log('! --seed: the demo products will have their price and stock reset to the seed values.');

  for (const file of files) {
    if (!existsSync(file)) fail(`${file} not found. Run this from the project root.`);
    const query = readFileSync(file, 'utf8');
    process.stdout.write(`→ ${file} (${query.split('\n').length} lines) … `);

    let res;
    try {
      res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
    } catch (e) {
      console.log('failed');
      fail(`Could not reach the Supabase API (${e instanceof Error ? e.message : e}). Check your internet connection.`);
    }

    const text = await res.text();
    if (!res.ok) {
      console.log('failed');
      if (res.status === 401 || res.status === 403) {
        fail(`Supabase rejected the token (HTTP ${res.status}). Create a fresh one at https://supabase.com/dashboard/account/tokens and update .env.local.`);
      }
      if (res.status === 404) fail(`Project "${ref}" was not found for this token (HTTP 404). Is the token from the same Supabase account?`);
      // A SQL error comes back with a message that points at the problem.
      fail(`Supabase answered HTTP ${res.status}:\n${text.slice(0, 1200)}`);
    }
    console.log('ok');
  }

  console.log('\n✔ Database is up to date. You can now delete the access token on https://supabase.com/dashboard/account/tokens\n');
}

main().catch(e => {
  console.error(`\n✖ ${e instanceof Failure ? e.message : e}\n`);
  process.exitCode = 1;
});
