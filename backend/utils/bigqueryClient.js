import { BigQuery } from '@google-cloud/bigquery';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const keyPath = path.resolve(__dirname, '../key.json');

const options = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.BIGQUERY_LOCATION,
};

let keyFilename = null;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
} else if (fs.existsSync(keyPath)) {
  keyFilename = keyPath;
}

if (keyFilename) {
  options.keyFilename = keyFilename;
}

const bigquery = new BigQuery(options);

let sharedAuthClient = null;

export async function getGoogleAuthToken() {
  if (!sharedAuthClient) {
    const authOptions = {
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    };
    if (keyFilename) {
      authOptions.keyFilename = keyFilename;
    }
    sharedAuthClient = new GoogleAuth(authOptions);
  }
  const client = await sharedAuthClient.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
}

export const bqService = {
  async executeQuery(query, params = null, queryOptions = {}) {
    const options = {
      query,
      location: process.env.BIGQUERY_LOCATION,
      ...queryOptions
    };

    if (params && Object.keys(params).length > 0) {
      options.params = params;
    }

    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    return rows;
  }
};

export default bqService;
