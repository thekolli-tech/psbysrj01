import 'dotenv/config';
import { runPostgresMigrations } from '../src/server/postgres.ts';
import { checkSchemaReadiness } from '../src/server/postgres.ts';
import { ESSENTIAL_CONFIG_SQL, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';
import { queryPostgres } from '../src/server/postgres.ts';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('[db:init] DATABASE_URL is required. This command initializes Neon PostgreSQL only.');
    console.error('[db:init] It does not open SQLite, import legacy records, or create accounts.');
    process.exit(1);
  }
  if (!schemaSqlIsNonDestructive(ESSENTIAL_CONFIG_SQL)) {
    console.error('[db:init] Refusing to run: essential config SQL is not limited to system metadata.');
    process.exit(1);
  }

  console.log('[db:init] Applying additive PostgreSQL schema. Existing rows are not dropped or imported.');
  await runPostgresMigrations();
  await queryPostgres(ESSENTIAL_CONFIG_SQL);

  const readiness = await checkSchemaReadiness();
  console.log(JSON.stringify({ schemaReady: readiness.ready, missing: readiness.missing }, null, 2));
  if (!readiness.ready) process.exit(1);
  console.log('[db:init] Schema is ready. Privileged accounts were not created. Run npm run bootstrap separately.');
}

main().catch(err => {
  console.error('[db:init] Failed:', err?.message || err);
  process.exit(1);
});
