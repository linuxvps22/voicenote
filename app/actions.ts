'use server';

import { createSpeechmaticsJWT } from '@speechmatics/auth';
import dns from 'dns';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

dns.setDefaultResultOrder('ipv4first');

export async function getJWT(type: 'flow' | 'rt') {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Please set the API_KEY environment variable');
  }

  return createSpeechmaticsJWT({ type, apiKey, ttl: 60 });
}

// --- API key store and usage utilities ---
type StoredApiKey = {
  id: string;        // unique id
  label?: string;    // optional display name
  apiKey: string;    // the raw Speechmatics Customer API token
  createdAt: string; // ISO timestamp
};

type KeyStatus = 'good' | 'kem' | 'het';

type KeyWithStatus = StoredApiKey & {
  usedHours: number;
  remainingHours: number;
  status: KeyStatus;
};

const MONTHLY_LIMIT_HOURS = 4; // 4 hours per month

function keysFilePath() {
  // Store under project root /data/api-keys.json
  return path.join(process.cwd(), 'data', 'api-keys.json');
}

async function ensureKeysFile() {
  const file = keysFilePath();
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify({ keys: [] }, null, 2), 'utf8');
  }
}

async function readKeys(): Promise<StoredApiKey[]> {
  await ensureKeysFile();
  const raw = await fs.readFile(keysFilePath(), 'utf8');
  const data = JSON.parse(raw || '{}');
  return Array.isArray(data?.keys) ? data.keys : [];
}

async function writeKeys(keys: StoredApiKey[]) {
  await ensureKeysFile();
  await fs.writeFile(keysFilePath(), JSON.stringify({ keys }, null, 2), 'utf8');
}

export async function listApiKeys(): Promise<StoredApiKey[]> {
  return readKeys();
}

export async function addApiKey(input: { apiKey: string; label?: string }): Promise<StoredApiKey> {
  const keys = await readKeys();
  const id = randomUUID();
  const item: StoredApiKey = {
    id,
    apiKey: input.apiKey,
    label: input.label,
    createdAt: new Date().toISOString(),
  };
  await writeKeys([...keys, item]);
  return item;
}

export async function updateApiKey(id: string, patch: Partial<Pick<StoredApiKey, 'apiKey' | 'label'>>): Promise<StoredApiKey> {
  const keys = await readKeys();
  const idx = keys.findIndex(k => k.id === id);
  if (idx === -1) throw new Error('Key not found');
  keys[idx] = { ...keys[idx], ...patch };
  await writeKeys(keys);
  return keys[idx];
}

export async function deleteApiKey(id: string): Promise<{ ok: true }> {
  const keys = await readKeys();
  const next = keys.filter(k => k.id !== id);
  await writeKeys(next);
  return { ok: true };
}

function startOfCurrentMonth(): string {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return first.toISOString().slice(0, 10); // YYYY-MM-DD
}

function endOfCurrentMonth(): string {
  const now = new Date();
  const firstNext = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return firstNext.toISOString().slice(0, 10); // YYYY-MM-DD (inclusive per API docs)
}

async function fetchUsageHoursForKey(apiKey: string): Promise<number> {
  const since = startOfCurrentMonth();
  const until = endOfCurrentMonth();
  const url = new URL('https://asr.api.speechmatics.com/v2/usage');
  url.searchParams.set('sincedate', since);
  url.searchParams.set('untildate', until);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    // Timeout recommendation could be added with AbortController if needed
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Usage fetch failed (${res.status})`);
  }
  const json: any = await res.json();
  // Sum duration_hrs across summary entries
  const summary: any[] = Array.isArray(json?.summary) ? json.summary : [];
  const hours = summary.reduce((acc, s) => acc + (Number(s?.duration_hrs) || 0), 0);
  return hours;
}

function statusFromRemaining(remainingHours: number): KeyStatus {
  if (remainingHours <= 0) return 'het';
  if (remainingHours * 60 < 30) return 'kem'; // under 30 minutes
  return 'good';
}

export async function getKeysWithStatus(): Promise<KeyWithStatus[]> {
  const keys = await readKeys();
  const results: KeyWithStatus[] = [];
  for (const k of keys) {
    try {
      const used = await fetchUsageHoursForKey(k.apiKey);
      const remaining = Math.max(0, MONTHLY_LIMIT_HOURS - used);
      results.push({ ...k, usedHours: used, remainingHours: remaining, status: statusFromRemaining(remaining) });
    } catch {
      // If usage fetch fails, mark as 'het' with 0 remaining to surface problem
      results.push({ ...k, usedHours: 0, remainingHours: 0, status: 'het' });
    }
  }
  return results;
}

// Optional: create JWT with a specific stored key id
export async function getJWTWithKeyId(type: 'flow' | 'rt', keyId: string) {
  const keys = await readKeys();
  const k = keys.find(x => x.id === keyId);
  if (!k) throw new Error('Key not found');
  return createSpeechmaticsJWT({ type, apiKey: k.apiKey, ttl: 60 });
}

// --- FormData helpers for use in <form action={...}> ---
export async function addApiKeyFromForm(formData: FormData) {
  const apiKey = formData.get('apiKey')?.toString();
  const label = formData.get('label')?.toString();
  if (!apiKey) throw new Error('apiKey is required');
  await addApiKey({ apiKey, label });
}

export async function deleteApiKeyFromForm(formData: FormData) {
  const id = formData.get('id')?.toString();
  if (!id) throw new Error('id is required');
  await deleteApiKey(id);
}

export async function updateApiKeyFromForm(formData: FormData) {
  const id = formData.get('id')?.toString();
  if (!id) throw new Error('id is required');
  const apiKey = formData.get('apiKey')?.toString();
  const label = formData.get('label')?.toString();
  await updateApiKey(id, { apiKey, label });
}
