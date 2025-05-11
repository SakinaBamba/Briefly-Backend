import type { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const client = Client.init({
    authProvider: (done) => done(null, token),
  });

  try {
    await client.api('/me/onlineMeetings/startTranscription').post({});
    res.status(200).json({ message: 'Transcription started' });
  } catch (error: any) {
    res.status(500).json({ error: 'Graph API error', detail: error.message || error });
  }
}
