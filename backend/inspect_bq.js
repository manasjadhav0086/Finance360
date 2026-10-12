import 'dotenv/config';
import bqService from './utils/bigqueryClient.js';

const project = process.env.GOOGLE_CLOUD_PROJECT || 'niit-finance-data';
const dataset = process.env.BIGQUERY_DATASET || 'Finance_View';

async function run() {
  const views = [
    'dataai_view',
    'orderintake_view',
    'capex_view',
    'collection_view',
    'enrollment_view',
    'headcount_view',
    'Headcount',
    'RevBizWise',
    'OrderBizWise',
    'pnldisqoq_view'
  ];

  for (const v of views) {
    try {
      const rows = await bqService.executeQuery(`SELECT * FROM \`${project}.${dataset}.${v}\` LIMIT 3`);
      console.log('=== ' + v + ' ===');
      if (rows && rows.length > 0) {
        console.log('Columns:', Object.keys(rows[0]));
        console.log('Sample row 0:', JSON.stringify(rows[0], null, 2));
      } else {
        console.log('Empty result');
      }
    } catch (e) {
      console.log('Error on ' + v + ':', e.message);
    }
  }
}

run();
