// File: pages/api/teams/startTranscription.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

const getGraphClient = (accessToken: string) => {
  return Client.init({
    authProvider: done => done(null, accessToken),
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { callId, ssoToken: tokenFromBody } = req.body;
  const authHeader = req.headers.authorization || '';
  const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const ssoToken = tokenFromBody || tokenFromHeader;

  if (!ssoToken || !callId) return res.status(400).json({ error: 'Missing ssoToken or callId' });

  try {
    const oboRequest = {
      oboAssertion: ssoToken,
      scopes: ['https://graph.microsoft.com/Calls.AccessMedia.All'],
    };

    const oboResult = await cca.acquireTokenOnBehalfOf(oboRequest);
    const graphToken = oboResult.accessToken;

    const client = getGraphClient(graphToken);

    await client.api(`/communications/calls/${callId}/transcription/start`)
      .post({
        clientContext: 'briefly_transcription',
        transcription: {
          language: 'en-US',
          region: 'us'
        }
      });

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Transcription start failed:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
