import dotenv from 'dotenv';
import path from 'path';
import { getD1Config, exportFeedFromD1 } from './lib/d1';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  console.log('⚡ WikiStash — Exporting Static CDN Feed from D1...');
  const config = getD1Config();
  const result = await exportFeedFromD1(config, 50);

  console.log(`Feed Export Complete:`);
  console.log(`  - Latest articles  : ${result.latestCount} in public/data/latest.json`);
  console.log(`  - Historical index : ${result.archiveCount} in public/data/archive-index.json`);
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
