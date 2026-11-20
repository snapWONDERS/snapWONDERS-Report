/*
 * snapWONDERS API — Result renderer (JavaScript)
 * API version: 1.0
 *
 * Copyright (c) 2026 Kenneth Springer @ snapWONDERS. MIT Licensed — see LICENSE.
 * The MIT licence covers this client library only; the snapWONDERS API it calls is proprietary.
 *
 * Author: Kenneth Springer @ snapWONDERS <kenneth@snapwonders.com> (https://kennethbspringer.au)
 *
 * All the snapWONDERS API services are available over the Clearnet / **Web** and Dark Web **Tor** and **I2P**
 * Read details: https://snapwonders.com/developers
 */

/**
 * Analyses one file and saves what the renderer needs: the result JSON and every analysis image.
 * This is the SERVER side of using the renderer — the API key never reaches a browser.
 *
 *   SNAPWONDERS_API_KEY=sw_… node scripts/fetch-example.mjs <file> [display-name]
 *
 * Writes examples/sample-result.json and examples/images/<asset_id>.<ext>, which is exactly what
 * examples/full.html expects. No dependencies; Node 18 or later.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, extname } from 'node:path';

//  The API URLs
const URL_SNAPWONDERS_API = 'https://snapwonders.com';
const POLL_SECONDS        = 5;
const POLL_LIMIT          = 120;

const apiKey = process.env.SNAPWONDERS_API_KEY;
const [, , file, displayName] = process.argv;
if (!apiKey || !file) {
    console.error('ERROR: usage: SNAPWONDERS_API_KEY=sw_… node scripts/fetch-example.mjs <file> [display-name]');
    process.exit(1);
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const out  = new URL('../examples/', import.meta.url);

//  One authenticated JSON call
async function call(method, path, body, headers = {}) {
    const response = await fetch(URL_SNAPWONDERS_API + path, {
        method,
        headers: { 'X-Api-Key': apiKey, ...(body && !(body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: body instanceof Uint8Array ? body : body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`${method} ${path} → ${response.status} ${text.slice(0, 300)}`);
    }
    return text ? JSON.parse(text) : null;
}

//  Create the session
console.log('CALL: create analyse session');
const session = await call('POST', '/api/analyse/session', {});

//  Upload the file in one request
const bytes = new Uint8Array(readFileSync(file));
console.log(`CALL: upload ${basename(file)} (${bytes.length} bytes)`);
await call('POST', '/api/upload', bytes, {
    'X-Upload-Uid': session.upload_uid,
    'X-Filename':   displayName || basename(file),
    'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
});

//  Start the job
console.log('CALL: start the analysis');
const job = await call('POST', '/api/analyse/job', {
    upload_uid: session.upload_uid, face_detection: true, text_detection: true, forensic_depth: 'standard', expiry: '1d',
});

//  Wait for the job to be completed
let status = job.status;
for (let i = 0; i < POLL_LIMIT && !['completed', 'partial', 'failed', 'terminated'].includes(status); i++) {
    await new Promise((r) => setTimeout(r, POLL_SECONDS * 1000));
    status = (await call('GET', `/api/analyse/job/${job.job_uid}`)).status;
    console.log(`INFO: ${status}`);
}
if (status !== 'completed') {
    throw new Error(`job ended as ${status}`);
}

//  The result as the API returned it, except that the job and asset ids are swapped for
//  placeholders: an example published on GitHub must not carry real ids
const result = await call('GET', `/api/analyse/result/${job.job_uid}`);
const assets = result.files.flatMap((f) => f.assets ?? []);
const ids    = new Map([[job.job_uid, '00000000-0000-4000-8000-000000000000']]);
assets.forEach((a, i) => ids.set(a.asset_id, `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`));
let text = JSON.stringify(result, null, 4);
for (const [real, placeholder] of ids) {
    text = text.split(real).join(placeholder);
}
writeFileSync(new URL('sample-result.json', out), text + '\n');
console.log(`SUCCESS: examples/sample-result.json (schema ${result.schema_version ?? 'unversioned'}, ids replaced)`);

//  Download every analysis image, named by its placeholder id
mkdirSync(new URL('images/', out), { recursive: true });
for (const asset of assets) {
    if (!String(asset.mime_type).startsWith('image/')) continue;
    const response = await fetch(URL_SNAPWONDERS_API + asset.download_path, { headers: { 'X-Api-Key': apiKey } });
    if (!response.ok) {
        console.log(`NOTE: ${asset.category} not downloaded (${response.status})`);
        continue;
    }
    const ext  = asset.mime_type === 'image/png' ? 'png' : 'jpg';
    const name = `${ids.get(asset.asset_id)}.${ext}`;
    writeFileSync(new URL(`images/${name}`, out), new Uint8Array(await response.arrayBuffer()));
    console.log(`SUCCESS: ${asset.category} → examples/images/${name}`);
}
