import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysqlService from './utils/mysqlClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',').map(p => p.trim());
    const row = {};
    header.forEach((h, idx) => {
      row[h] = parts[idx];
    });
    rows.push(row);
  }
  return rows;
}

export async function seedCapexAndCollection() {
  const [capexCount] = await mysqlService.executeQuery('SELECT count(*) as c FROM capex');
  const [collectionCount] = await mysqlService.executeQuery('SELECT count(*) as c FROM collection');

  const dataDir = path.resolve(__dirname, '../Data');

  if (capexCount.c === 0) {
    const capexFile = path.join(dataDir, 'Capex.csv');
    if (fs.existsSync(capexFile)) {
      const rows = parseCsv(capexFile);
      console.log(`Seeding capex table with ${rows.length} rows...`);
      for (const r of rows) {
        await mysqlService.executeQuery(
          'INSERT INTO capex (Segment, Biz1, Nature, Year, Month, Amount) VALUES (?, ?, ?, ?, ?, ?)',
          [r.Segment, r.Biz1, r.Nature, r.Year, r.Month, parseFloat(r.Amount) || 0]
        );
      }
      console.log('Capex table seeded successfully.');
    }
  }

  if (collectionCount.c === 0) {
    const collectionFile = path.join(dataDir, 'Collection.csv');
    if (fs.existsSync(collectionFile)) {
      const rows = parseCsv(collectionFile);
      console.log(`Seeding collection table with ${rows.length} rows...`);
      for (const r of rows) {
        await mysqlService.executeQuery(
          'INSERT INTO collection (Segment, Biz1, Nature, Year, Month, Amount) VALUES (?, ?, ?, ?, ?, ?)',
          [r.Segment, r.Biz1, r.Nature, r.Year, r.Month, parseFloat(r.Amount) || 0]
        );
      }
      console.log('Collection table seeded successfully.');
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedCapexAndCollection()
    .then(async () => {
      const [cx, co] = await Promise.all([
        mysqlService.executeQuery('SELECT count(*) as c FROM capex'),
        mysqlService.executeQuery('SELECT count(*) as c FROM collection')
      ]);
      console.log('Current counts:', { capex: cx[0].c, collection: co[0].c });
      await mysqlService.close();
    })
    .catch(err => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
