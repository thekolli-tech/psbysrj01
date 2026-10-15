import 'dotenv/config';
import { buildHealthReport } from '../src/server/health.ts';

async function main(): Promise<void> {
  const report = await buildHealthReport();
  console.log(JSON.stringify(report.body, null, 2));
  process.exit(report.httpStatus === 200 ? 0 : 1);
}

main().catch(err => {
  console.error('[db:check] Failed:', err?.message || err);
  process.exit(1);
});
