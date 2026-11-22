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

/*
 * The renderer must never fail on a result (owner 2026-11-20): a field that is missing, null or of the
 * wrong type is simply not drawn, as later API versions may deprecate or remove fields. For every field
 * in each fixture this deletes it, or sets it to null, a string or a number, then builds the model and
 * draws it (card and full) through the real element code on a minimal DOM stand-in. No dependencies.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { buildCardModel } from '../src/model.js';

//  ---- Minimal DOM stand-in: just what element.js uses ----
class FakeNode {
    constructor(tag) {
        this.tagName = tag;
        this.children = [];
        this.attributes = {};
        this.style = {};
        this._text = '';
    }
    get childNodes() { return this.children; }
    get textContent() {
        return this._text + this.children.map((c) => c.textContent).join('');
    }
    set textContent(v) {
        this._text = String(v);
        this.children = [];
    }
    append(...nodes) {
        for (const n of nodes) this.children.push(typeof n === 'string' ? new FakeText(n) : n);
    }
    appendChild(n) { this.append(n); return n; }
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
    hasAttribute(k) { return k in this.attributes; }
    removeAttribute(k) { delete this.attributes[k]; }
    addEventListener() {}
    querySelector() { return null; }
}
class FakeText {
    constructor(t) { this.textContent = String(t); this.children = []; }
}
globalThis.document = {
    createElement: (tag) => new FakeNode(tag),
    createTextNode: (t) => new FakeText(t),
};
class FakeHost extends FakeNode {
    constructor() { super('snapwonders-report'); this.isConnected = true; this.events = []; }
    attachShadow() { this.shadowRoot = new FakeNode('#shadow'); return this.shadowRoot; }
    dispatchEvent(e) { this.events.push(e.type); return true; }
}
globalThis.HTMLElement = FakeHost;
if (typeof globalThis.CustomEvent === 'undefined') {
    globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
}
//  element.js picks its base class at import, so import it after the stand-in is in place
const { renderCard, SnapwondersReport } = await import('../src/element.js');

//  ---- Fixtures: this package's own, plus the site's example results when run inside the monorepo ----
const fixtureDir = new URL('./fixtures/', import.meta.url);
const fixtures = readdirSync(fixtureDir).filter((f) => f.endsWith('.json'))
    .map((f) => [f, JSON.parse(readFileSync(new URL(f, fixtureDir), 'utf8'))]);
for (const name of ['camera-original', 'ai-generated', 'edited-photo']) {
    const p = new URL(`../../../public/images/report-examples/${name}/result.json`, import.meta.url);
    if (existsSync(p)) fixtures.push([name, JSON.parse(readFileSync(p, 'utf8'))]);
}

function paths(o, p = []) {
    const out = [];
    if (o && typeof o === 'object') {
        for (const k of Object.keys(o)) {
            out.push([...p, k]);
            out.push(...paths(o[k], [...p, k]));
        }
    }
    return out;
}

function damage(base, path, how) {
    const r = structuredClone(base);
    let o = r;
    for (const k of path.slice(0, -1)) o = o[k];
    const k = path.at(-1);
    if (how === 'delete') delete o[k];
    else if (how === 'null') o[k] = null;
    else if (how === 'string') o[k] = 'x';
    else o[k] = 7;
    return r;
}

const assetUrl = (a) => `https://example.test/${encodeURIComponent(String(a && a.name ? a.name : 'asset'))}`;

for (const [name, base] of fixtures) {
    test(`damaged results never crash the model or the drawing: ${name}`, () => {
        const failures = [];
        let runs = 0;
        for (const path of paths(base)) {
            for (const how of ['delete', 'null', 'string', 'number']) {
                const r = damage(base, path, how);
                for (const mode of ['card', 'full']) {
                    runs++;
                    try {
                        const model = buildCardModel(r, { mode, assetUrl });
                        const card = renderCard(model, { reportUrl: 'https://snapwonders.com/r/x', onCheckAnother: () => {} });
                        const text = card.textContent;
                        if (/\[object Object\]|undefined|NaN/.test(text)) {
                            failures.push(`${mode} ${how} ${path.join('.')}: drew "${text.match(/\[object Object\]|undefined|NaN/)[0]}"`);
                        }
                    } catch (e) {
                        failures.push(`${mode} ${how} ${path.join('.')}: ${e.message}`);
                    }
                }
            }
        }
        assert.ok(runs > 100, `${name}: only ${runs} runs`);
        assert.deepEqual([...new Set(failures)].slice(0, 20), []);
    });
}

test('the element draws a damaged result and still announces a newer version', () => {
    const [, base] = fixtures[0];
    const host = new SnapwondersReport();
    host.setAttribute('mode', 'full');
    for (const [, r] of [[0, null], [0, {}], [0, { files: 'x' }], [0, { files: [null] }], [0, { ...base, schema_version: 7 }]]) {
        host.result = r;
        assert.ok(host.shadowRoot.children.length === 2);
    }
    host.result = { ...base, schema_version: '1.99' };
    assert.match(host.shadowRoot.textContent, /A new version is available/);
    assert.ok(host.events.includes('snapwonders-update-available'));
    host.result = { ...base, schema_version: '2.0' };
    assert.match(host.shadowRoot.textContent, /Update needed/);
    host.setAttribute('dismissed-update', '2.0');
    host.result = { ...base, schema_version: '2.0' };
    assert.doesNotMatch(host.shadowRoot.textContent, /Update needed/);
    host.result = { ...base, schema_version: '2.1' };
    assert.match(host.shadowRoot.textContent, /Update needed/, 'back on the next version');
});
