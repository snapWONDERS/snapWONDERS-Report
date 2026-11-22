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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

//  Build once, then check the single file
execFileSync(process.execPath, [new URL('../scripts/build.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')]);
const built = readFileSync(new URL('../dist/snapwonders-report.js', import.meta.url), 'utf8');

test('the single file has no module syntax and makes no network calls', () => {
    assert.doesNotMatch(built, /^\s*(import|export)\s/m);
    for (const call of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'import(', 'eval(', 'new Function']) {
        assert.ok(!built.includes(call), `contains ${call}`);
    }
});

test('the single file runs as a classic script and exposes the model', () => {
    const context = { globalThis: {} };
    context.globalThis = context;
    vm.runInNewContext(built, context);
    const api = context.snapwondersReport;
    assert.equal(typeof api.buildCardModel, 'function');
    assert.equal(api.buildCardModel({ schema_version: '1.1', files: [{ grade: 'A' }] }).headlines[0].word, 'Nothing significant found');
});
