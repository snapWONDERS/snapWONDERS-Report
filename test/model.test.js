/*
 * snapWONDERS API â€” Result renderer (JavaScript)
 * API version: 1.0
 *
 * Copyright (c) 2026 Kenneth Springer @ snapWONDERS. MIT Licensed â€” see LICENSE.
 * The MIT licence covers this client library only; the snapWONDERS API it calls is proprietary.
 *
 * Author: Kenneth Springer @ snapWONDERS <kenneth@snapwonders.com> (https://kennethbspringer.au)
 *
 * All the snapWONDERS API services are available over the Clearnet / **Web** and Dark Web **Tor** and **I2P**
 * Read details: https://snapwonders.com/developers
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCardModel, SUPPORTED_SCHEMA, parseSchemaVersion, parseLinkParams, snapwondersLink, MAX_FINDINGS } from '../src/model.js';

//  The example result shipped in the repo
const sample = JSON.parse(readFileSync(new URL('./fixtures/result-1.1.json', import.meta.url), 'utf8'));

test('reads the example result', () => {
    const m = buildCardModel(sample);
    assert.equal(m.ok, true);
    assert.equal(m.updateAvailable, false);
    assert.equal(m.headlines.length, 2);
    assert.equal(m.headlines[0].title, 'Authenticity');
    assert.equal(m.headlines[1].title, 'Exposure');
});

test('grades become the report page words, with confidence', () => {
    const m = buildCardModel({ schema_version: '1.0', files: [{ grade: 'D', confidence: 'medium', exposure_grade: 'A', exposure_confidence: 'high' }] });
    assert.equal(m.headlines[0].word, 'High risk');
    assert.equal(m.headlines[0].confidence, 'Medium');
    assert.equal(m.headlines[1].word, 'Nothing significant found');
});

test('a missing grade says it could not tell, never clean', () => {
    const m = buildCardModel({ files: [{ grade: null, exposure_grade: null }] });
    assert.equal(m.headlines[0].grade, null);
    assert.equal(m.headlines[0].word, "Couldn't tell");
    assert.match(m.headlines[1].note, /isn't the same as a clean result/);
});

test('an unknown grade letter is not shown as a grade', () => {
    const m = buildCardModel({ files: [{ grade: 'Z', confidence: 'high' }] });
    assert.equal(m.headlines[0].grade, null);
    assert.equal(m.headlines[0].confidence, null);
});

test('low confidence is flagged', () => {
    const m = buildCardModel({ files: [{ grade: 'B', confidence: 'low' }] });
    assert.equal(m.headlines[0].lowConfidence, true);
});

test('schema versions', () => {
    assert.deepEqual(parseSchemaVersion(undefined), { major: 1, minor: 0 });
    assert.deepEqual(parseSchemaVersion('1.4'), { major: 1, minor: 4 });
    assert.equal(parseSchemaVersion('banana'), null);
    assert.equal(buildCardModel({ schema_version: SUPPORTED_SCHEMA, files: [{}] }).updateAvailable, false, 'the version this renderer knows');
    assert.equal(buildCardModel({ schema_version: '1.3', files: [{}] }).updateAvailable, false, 'older results need no update');
    assert.equal(buildCardModel({ schema_version: '1.5', files: [{}] }).updateAvailable, true, 'a minor bump shows the note too (owner 2026-11-20)');
    assert.equal(buildCardModel({ schema_version: '2.0', files: [{}] }).updateAvailable, true, 'a major bump asks for an update');
    assert.equal(buildCardModel({ schema_version: 'x', files: [{}] }).updateAvailable, true);
});

test('update note: gentle for minor, firm for major, hidden once dismissed until the next version', () => {
    const note = (v, d) => buildCardModel({ schema_version: v, files: [{}] }, { dismissedUpdate: d }).update;
    assert.equal(note(SUPPORTED_SCHEMA), null);
    assert.equal(note('1.5').level, 'minor');
    assert.match(note('1.5').text, /^A new version is available/);
    assert.equal(note('1.5').schemaVersion, '1.5');
    assert.equal(note('2.0').level, 'major');
    assert.match(note('2.0').text, /^Update needed/);
    assert.equal(note('x').level, 'major', 'an unreadable version is treated as major');
    assert.equal(note('1.5', '1.5'), null, 'dismissed for this version');
    assert.equal(note('1.5', '1.6'), null, 'dismissed for a later one');
    assert.equal(note('1.6', '1.5').level, 'minor', 'back on the next version');
    assert.equal(note('2.0', '1.9').level, 'major');
    assert.equal(note('1.5', 'junk').level, 'minor');
    assert.equal(note('1.5', 7).level, 'minor');
});

test('faces keep possible faces, never drop them', () => {
    const rows = buildCardModel({ files: [{ face_count: 3, face_count_by_confidence: { high: 1, moderate: 1, low: 1 } }] }).evidence;
    assert.deepEqual(rows.find((r) => r.label === 'Faces'), { label: 'Faces', value: '2 faces, 1 possible face' });
    const none = buildCardModel({ files: [{ face_count: 0 }] }).evidence;
    assert.equal(none.find((r) => r.label === 'Faces').value, 'None found');
});

test('unknown verdict values are left out rather than guessed', () => {
    const rows = buildCardModel({ files: [{ verdicts: { ai_generation: { verdict: 'something_new' } } }] }).evidence;
    assert.equal(rows.find((r) => r.label === 'AI generation'), undefined);
});

test('findings: most serious first, capped, with a count of the rest', () => {
    const findings = [
        { label: 'a', severity: 'info' }, { label: 'b', severity: 'high' }, { label: 'c', severity: 'medium' },
        { label: 'd', severity: 'low' }, { label: 'e', severity: 'high' }, { label: 'f', severity: 'info' },
        { label: '', severity: 'high' }, { severity: 'high' },
    ];
    const m = buildCardModel({ files: [{ verdicts: { findings } }] });
    assert.equal(m.findings.shown.length, MAX_FINDINGS);
    assert.deepEqual(m.findings.shown.map((f) => f.label), ['b', 'e', 'c', 'd', 'a']);
    assert.equal(m.findings.more, 1);
});

test('attribution and the Vaultify link come only from the result, on snapWONDERS hosts', () => {
    const m = buildCardModel(sample);
    assert.deepEqual(m.attribution, { text: 'Checked by snapWONDERS', url: 'https://snapwonders.com/' });
    assert.equal(m.vaultifyCta.url, 'https://snapwonders.com/upload/hide');

    //  No attribution in the result: the renderer adds none of its own
    assert.equal(buildCardModel({ files: [{}] }).attribution, null);

    //  Anything not https on snapwonders.com is dropped
    for (const url of ['https://evil.example/', 'http://snapwonders.com/', 'https://snapwonders.com.evil.example/',
        'javascript:alert(1)', 'https://user:pw@snapwonders.com/']) {
        assert.equal(buildCardModel({ attribution: { text: 'x', url }, files: [{}] }).attribution, null, url);
    }
    assert.equal(buildCardModel({ attribution: { text: 'x', url: 'https://vaultify.snapwonders.com/' }, files: [{}] }).attribution.url,
        'https://vaultify.snapwonders.com/');
});

test('link parameters: only the allowed keys and plain values are added', () => {
    assert.deepEqual(parseLinkParams('src=wp&site=ab12&r=9f&evil=1&src2=x&site=<b>'), [['src', 'wp'], ['site', 'ab12'], ['r', '9f']]);
    const m = buildCardModel(sample, { linkParams: 'src=ext' });
    assert.equal(m.attribution.url, 'https://snapwonders.com/?src=ext');
    assert.equal(m.vaultifyCta.url, 'https://snapwonders.com/upload/hide?src=ext');
    assert.equal(snapwondersLink('https://evil.example/', [['src', 'x']]), null);
});

test('pixel analysis has its own row', () => {
    const rows = buildCardModel({ files: [{ verdicts: { ai_generation: { verdict: 'inconclusive', pixel_analysis: 'flagged' } } }] }).evidence;
    assert.equal(rows.find((r) => r.label === 'Pixel analysis').value, 'Signs of AI generation detected');
});

test('full mode: every finding, the extra checks, and images the host supplies', () => {
    const file = {
        verdicts: {
            findings: Array.from({ length: 8 }, (_, i) => ({ label: `f${i}`, severity: 'low' })),
            steganography: { verdict: 'none', checks_run: ['internal_name'], conclusive: false },
            camera_fingerprint: { applicable: true, matched: true, encoder_name: 'Adobe Photoshop' },
            forensic: { ela: { high_fraction: 0.123 }, noise_inconsistency: { anomaly_tile_count: 2 } },
            audio_splice: { applicable: true, verdict: 'possible' },
        },
        assets: [
            { category: 'forensic_noise_map', mime_type: 'image/jpeg', download_path: '/api/analyse/asset/2' },
            { category: 'display_image', mime_type: 'image/jpeg', download_path: '/api/analyse/asset/1' },
            { category: 'forensic_nss_chart', mime_type: 'image/png', download_path: '/api/analyse/asset/3' },
            { category: 'forensic_clone', mime_type: 'image/jpeg', download_path: '/api/analyse/asset/4' },
        ],
    };
    const local = (a) => (a.category === 'forensic_clone' ? null : `/wp-content/uploads/snapwonders/${a.download_path.split('/').pop()}.jpg`);

    const card = buildCardModel({ files: [file] }, { assetUrl: local });
    assert.equal(card.findings.shown.length, MAX_FINDINGS);
    assert.equal(card.images.length, 0, 'the card shows no images');
    assert.equal(card.evidence.find((r) => r.label === 'Hidden content'), undefined);

    const full = buildCardModel({ files: [file] }, { mode: 'full', assetUrl: local });
    assert.equal(full.findings.shown.length, 8);
    assert.equal(full.findings.more, 0);
    const value = (label) => full.evidence.find((r) => r.label === label)?.value;
    assert.equal(value('Hidden content'), 'Nothing found by the checks that ran');
    assert.equal(value('Encoder fingerprint'), 'Matches Adobe Photoshop');
    assert.equal(value('Compression differences'), '12% of the image');
    assert.equal(value('Noise differences'), undefined, 'the pre-1.2 count is not drawn');
    assert.equal(value('Audio edits'), 'Possible signs found');
    assert.ok(!JSON.stringify(full).includes('internal_name'), 'check names are never shown');
    assert.deepEqual(full.images.map((i) => i.category), ['display_image', 'forensic_noise_map'], 'ordered, unknown and unresolved left out');
    assert.equal(full.images[0].src, '/wp-content/uploads/snapwonders/1.jpg');

    assert.equal(buildCardModel({ files: [file] }, { mode: 'full' }).images.length, 0, 'no resolver, no images, no fetching');
});

test('nothing to show', () => {
    assert.equal(buildCardModel(null).ok, false);
    assert.equal(buildCardModel({ files: [] }).ok, false);
    assert.equal(buildCardModel({ files: [{}] }, { fileIndex: 3 }).ok, false);
});

test('watermark: the API label is shown as given, and nothing when absent', () => {
    const row = (verdicts) => buildCardModel({ files: [{ grade: 'B', verdicts }] }).evidence.find((r) => r.label === 'Watermark');
    assert.deepEqual(row({ watermark: { state: 'visible_mark', label: 'Visible watermark found' } }), { label: 'Watermark', value: 'Visible watermark found' });
    assert.equal(row({ watermark: { state: null, label: '' } }), undefined);
    assert.equal(row({}), undefined);
});
test('noise differences: drawn only from schema 1.2, where the count matches the web report', () => {
    const file  = { grade: 'B', verdicts: { forensic: { noise_inconsistency: { anomaly_tile_count: 2 } } } };
    const noise = (v) => buildCardModel({ schema_version: v, files: [file] }, { mode: 'full' }).evidence.find((r) => r.label === 'Noise differences')?.value;
    assert.equal(noise('1.1'), undefined);
    assert.equal(noise('1.2'), '2 areas');
});

//  A real schema 1.3 result (an edited photo), ids replaced
const v13 = JSON.parse(readFileSync(new URL('./fixtures/result-1.3.json', import.meta.url), 'utf8'));
const allAssets = (a) => `/img/${a.asset_id}.jpg`;

test('1.1 and explanation: null say nothing new', () => {
    for (const m of [buildCardModel(sample, { mode: 'full' }), buildCardModel({ files: [{ grade: 'B', explanation: null }] }, { mode: 'full' })]) {
        assert.deepEqual(m.categories, []);
        assert.equal(m.evidenceMaps, null);
        for (const h of m.headlines) {
            assert.equal(h.weakestArea, null);
            assert.equal(h.softened, false);
            assert.deepEqual(h.warnings, []);
            assert.equal(h.partial, false);
        }
    }
});

test('1.3 full view: weakest area, softened, categories with reasons and also noted', () => {
    const m = buildCardModel(v13, { mode: 'full', assetUrl: allAssets });
    assert.equal(m.headlines[0].weakestArea, 'Manipulation');
    assert.equal(m.headlines[0].softened, true);
    assert.equal(m.headlines[1].weakestArea, 'Privacy');
    assert.deepEqual(m.categories.map((c) => `${c.name} ${c.grade}`), ['Origin B', 'Manipulation C', 'Privacy B', 'Security A'], 'ungraded AI generation left out');
    const manip = m.categories.find((c) => c.name === 'Manipulation');
    assert.deepEqual(manip.reasons.map((r) => r.label), ['Thumbnail matches main image', 'Noise level inconsistency']);
    const origin = m.categories.find((c) => c.name === 'Origin');
    assert.equal(origin.alsoNoted.length, 5);
    assert.ok(!origin.reasons.some((r) => origin.alsoNoted.includes(r.label)), 'a label is never both');
    assert.equal(m.alsoNoted.title, 'Also noted - not used for your grade');
    assert.match(m.alsoNoted.text, /most photos, including untouched ones/);
});

test('evidence maps: web order and wording, never the ghost curve, and they replace the older pictures', () => {
    const file = structuredClone(v13.files[0]);
    file.assets.push({ asset_id: 'x', category: 'forensic_ghost_curve', mime_type: 'image/png', download_path: '/x' });
    const m = buildCardModel({ schema_version: '1.3', files: [file] }, { mode: 'full', assetUrl: allAssets });
    assert.deepEqual(m.evidenceMaps.maps.map((x) => x.title),
        ['Regions', 'Noise', 'Compression', 'Natural Scene Statistics Check', 'Since the camera']);
    assert.equal(m.evidenceMaps.note, null, 'a Regions map is present');
    assert.match(m.evidenceMaps.intro, /A quiet map does not mean a good grade/);
    assert.ok(!m.images.some((i) => ['forensic_ela', 'forensic_ela_anomaly', 'forensic_noise_map'].includes(i.category)));
    assert.ok(!JSON.stringify(m).includes('ghost_curve'));
});

test('no Regions map is never shown as clean', () => {
    const only = (cats) => ({ files: [{ grade: 'A', assets: cats.map((c, i) => ({ asset_id: String(i), category: c, mime_type: 'image/jpeg', download_path: `/${i}` })) }] });
    const note = (cats) => buildCardModel(only(cats), { mode: 'full', assetUrl: allAssets }).evidenceMaps?.note;
    assert.match(note(['forensic_noise_field', 'forensic_ela_field']), /^No check marked an area in this photo\. This is not proof/);
    assert.match(note(['forensic_noise_field', 'forensic_dct_map']), /^No check flagged an area.*Save history/);
    assert.equal(buildCardModel(only(['forensic_noise_field']), { mode: 'full' }).evidenceMaps, null, 'no resolver, no maps');
});

test('partial coverage and warnings, with the web wording', () => {
    const file = { grade: 'C', confidence: 'low', grade_partial_coverage: true,
        explanation: { authenticity: { decided_by: 'origin', softened: true, warnings: ['Few checks could run'], not_assessed: ['ai_generation'] } } };
    const h = buildCardModel({ files: [file] }, { mode: 'full' }).headlines[0];
    assert.equal(h.partial, true);
    assert.deepEqual(h.warnings, ['Few checks could run']);
    assert.equal(buildCardModel({ files: [{ ...file, grade: null }] }).headlines[0].partial, false, 'no grade, no partial line');
});

test('a poisoned explanation is dropped', () => {
    const file = { grade: 'B', explanation: {
        authenticity: { decided_by: 'score_internal', warnings: [7, '', null], softened: 'yes' },
        categories: { origin: { grade: 'Z', reasons: [{ label: 'x' }] }, secret: { grade: 'A' },
            privacy: { grade: 'B', reasons: [{ label: 42 }, null, { label: 'Has GPS?', effect: 'reassuring', weight: 9 }], also_noted: [{}, { label: 3 }] } } } };
    const m = buildCardModel({ files: [file] }, { mode: 'full' });
    assert.equal(m.headlines[0].weakestArea, null);
    assert.equal(m.headlines[0].softened, false);
    assert.deepEqual(m.headlines[0].warnings, []);
    assert.deepEqual(m.categories, [{ name: 'Privacy', grade: 'B', reasons: [{ label: 'Has GPS', reassuring: true }], alsoNoted: [] }]);
    assert.ok(!JSON.stringify(m).includes('weight'));
});

//  Schema 1.4: the API.md example capture block
const capture14 = {
    when:  { label: 'When', value: 'The file says: taken 2018-07-25, 11:47 (no time zone)', why: 'From the time recorded in the file.', recorded: true, sources: ['file'], meaning: 'taken' },
    where: { label: 'Where', value: 'The file says: Melbourne, Australia', why: 'From the GPS position in the file (-37.81, 144.96).', recorded: true, sources: ['file'],
        state: 'location', city: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631, zone: null,
        credit: { text: 'Map data from OpenStreetMap', url: 'https://www.openstreetmap.org/copyright' } },
    what:  { label: 'Camera or phone', value: 'The file says: Sony E6653', why: 'From the camera details in the file.', recorded: true, sources: ['file'] },
    apps:  { label: 'Software and apps it passed through', value: 'No app is suggested', why: '…', recorded: false, sources: [] },
    tip:   'The original may hold more. Ask the person who took it for the original file.',
};

test('capture: the web card line for line, a map link from the numbers, and the OpenStreetMap credit', () => {
    const m = buildCardModel({ schema_version: '1.4', files: [{ grade: 'A', capture: capture14 }] }, { mode: 'full' });
    assert.deepEqual(m.capture.lines.map((l) => l.label), ['When', 'Where', 'Camera or phone', 'Software and apps it passed through']);
    const where = m.capture.lines[1];
    assert.equal(where.map, 'https://www.openstreetmap.org/?mlat=-37.81360&mlon=144.96310#map=15/-37.81360/144.96310');
    assert.deepEqual(where.credit, { text: 'Map data from OpenStreetMap', url: 'https://www.openstreetmap.org/copyright' });
    assert.deepEqual(where.sources, [{ key: 'file', text: 'From the file' }]);
    assert.equal(m.capture.lines[3].recorded, false);
    assert.match(m.capture.tip, /^The original may hold more/);
});

test('capture: hidden when null, location left out on request, and nothing unsafe linked', () => {
    assert.equal(buildCardModel({ files: [{ capture: null }] }).capture, null);
    assert.equal(buildCardModel(sample).capture, null);
    const hidden = buildCardModel({ files: [{ capture: capture14 }] }, { hideLocation: true });
    assert.ok(!hidden.capture.lines.some((l) => l.id === 'where'));
    assert.ok(!JSON.stringify(hidden).includes('Melbourne') && !JSON.stringify(hidden).includes('-37.8'));

    const bad = structuredClone(capture14);
    Object.assign(bad.where, { lat: '1; javascript:', lng: 999, credit: { text: 'x', url: 'https://evil.example/' } });
    bad.what.sources = ['file', 'secret', 'file'];
    const m = buildCardModel({ files: [{ capture: bad }] }, { mode: 'full' });
    assert.equal(m.capture.lines[1].map, null);
    assert.equal(m.capture.lines[1].credit.url, 'https://www.openstreetmap.org/copyright');
    assert.deepEqual(m.capture.lines[2].sources.map((s) => s.key), ['file']);
});

test('capture in card mode: the lines only, no why, tags or tip', () => {
    const c = buildCardModel({ files: [{ capture: capture14 }] }).capture;
    assert.equal(c.tip, null);
    assert.ok(c.lines.every((l) => l.why === null && l.sources.length === 0));
    assert.ok(c.lines[1].map && c.lines[1].credit, 'the place keeps its map link and credit');
});

test('capture in card mode: three "not recorded" lines become one; the full report keeps all four', () => {
    const none = { label: 'x', value: 'Not recorded in this file', why: 'w', recorded: false, sources: [] };
    const cap  = { when: { ...none, label: 'When' }, where: { ...none, label: 'Where', state: 'not_recorded' },
        what: { ...none, label: 'Camera or phone' }, apps: { label: 'Software and apps it passed through', value: 'No app is suggested', recorded: false, sources: [] } };
    const card = buildCardModel({ files: [{ capture: cap }] }).capture.lines;
    assert.deepEqual(card.map((l) => `${l.label}: ${l.value}`),
        ['When · Where · Camera or phone: Not recorded in this file', 'Software and apps it passed through: No app is suggested']);
    assert.equal(buildCardModel({ files: [{ capture: cap }] }, { mode: 'full' }).capture.lines.length, 4);
    const some = buildCardModel({ files: [{ capture: { ...cap, what: capture14.what } }] }).capture.lines;
    assert.equal(some.length, 4, 'nothing merged when one line is recorded');
});

test('Since the camera (1.4): an unmarked map lets the honest line show; a mismatch shows the preview', () => {
    const asset = (c, i) => ({ asset_id: String(i), category: c, mime_type: 'image/jpeg', download_path: `/${i}` });
    const file  = (cam, cats) => ({ files: [{ grade: 'A', verdicts: { forensic: { camera_map: cam } }, assets: cats.map(asset) }] });
    const ev    = (cam, cats) => buildCardModel(file(cam, cats), { mode: 'full', assetUrl: allAssets }).evidenceMaps;
    assert.match(ev({ matched: true, marked: false }, ['forensic_camera_map']).note, /^No check marked an area/);
    assert.equal(ev({ matched: true, marked: true }, ['forensic_camera_map']).note, null);
    assert.equal(ev(undefined, ['forensic_camera_map']).note, null, 'before 1.4 a marked map cannot be ruled out');
    const nm = ev({ matched: false, marked: false }, ['exif_thumbnail']);
    assert.match(nm.noMatch.text, /^The camera's preview does not match this photo/);
    assert.equal(nm.noMatch.preview.src, '/img/0.jpg');
    assert.equal(nm.note, null);
});

test('card mode keeps to the list tile: no categories, maps or images', () => {
    const m = buildCardModel(v13, { assetUrl: allAssets });
    assert.deepEqual(m.categories, []);
    assert.equal(m.evidenceMaps, null);
    assert.equal(m.images.length, 0);
});