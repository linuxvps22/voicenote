'use server';

import { createSpeechmaticsJWT } from '@speechmatics/auth';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

export async function getJWT(type: 'flow' | 'rt') {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Please set the API_KEY environment variable');
  }

  return createSpeechmaticsJWT({ type, apiKey, ttl: 60 });
}
