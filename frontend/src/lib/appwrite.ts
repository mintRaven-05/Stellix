import { Client, Account, Databases, ID, Query } from 'appwrite';

function normalizeHttpEndpoint(raw: string) {
  // must be like https://host/v1
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }
  // ensure /v1 exists
  if (!raw.endsWith('/v1')) {
    raw = raw.replace(/\/$/, '');
    if (!raw.endsWith('/v1')) raw = `${raw}/v1`;
  }
  return raw;
}

function toRealtimeEndpoint(httpEndpointV1: string) {
  // Appwrite realtime default is .../v1/realtime :contentReference[oaicite:2]{index=2}
  const wsBase = httpEndpointV1.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
  return `${wsBase}/realtime`;
}

const endpointRaw = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpointRaw) throw new Error('Missing NEXT_PUBLIC_APPWRITE_ENDPOINT');
if (!projectId) throw new Error('Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID');

const endpoint = normalizeHttpEndpoint(endpointRaw);
const realtimeEndpoint = toRealtimeEndpoint(endpoint);

export const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  // This is from Appwrite Realtime docs: setEndpointRealtime if needed :contentReference[oaicite:3]{index=3}
  .setEndpointRealtime(realtimeEndpoint);

// optional: helps if you run self-hosted with self-signed certs
try {
  // @ts-ignore
  client.setSelfSigned(true);
} catch {}

export const account = new Account(client);
export const databases = new Databases(client);

export { ID, Query };
