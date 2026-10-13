import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysqlService from './utils/mysqlClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportDatabase() {
  console.log('[Export] Generating schema and synthetic data SQL dump...');
  const outputFile = path.resolve(__dirname, 'finance_data_dump.sql');
  const writeStream = fs.createWriteStream(outputFile, { encoding: 'utf8' });

  writeStream.write('-- ====================================================\n');
  writeStream.write('-- FINANCE360 SYNTHETIC DATA SQL DUMP\n');
  writeStream.write('-- Generated for zero-cost local or cloud MySQL deployment\n');
  writeStream.write('-- ====================================================\n\n');
  writeStream.write('CREATE DATABASE IF NOT EXISTS `finance_data`;\n');
  writeStream.write('USE `finance_data`;\n\n');

  const tables = ['users', 'capex', 'collection', 'order_intake', 'dataai'];

  for (const table of tables) {
    console.log(`[Export] Processing table: ${table}...`);
    const [createRes] = await mysqlService.executeQuery(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createRes['Create Table'];
    writeStream.write(`-- Table structure for \`${table}\`\n`);
    writeStream.write(`DROP TABLE IF EXISTS \`${table}\`;\n`);
    writeStream.write(`${createSql};\n\n`);

    const rows = await mysqlService.executeQuery(`SELECT * FROM \`${table}\``);
    if (rows && rows.length > 0) {
      writeStream.write(`-- Dumping data for \`${table}\` (${rows.length} rows)\n`);
      const columns = Object.keys(rows[0]);
      const colList = columns.map(c => `\`${c}\``).join(', ');

      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const valueStrings = batch.map(row => {
          const vals = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return String(val);
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          return `(${vals.join(', ')})`;
        });
        writeStream.write(`INSERT INTO \`${table}\` (${colList}) VALUES\n${valueStrings.join(',\n')};\n`);
      }
      writeStream.write('\n');
    }
  }

  writeStream.end();
  console.log(`[Export] Database dump successfully written to: ${outputFile}`);
  await mysqlService.close();
}

exportDatabase().catch(err => {
  console.error('[Export Error]', err);
  process.exit(1);
});
