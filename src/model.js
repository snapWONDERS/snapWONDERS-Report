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
 * Turns one analyse result (GET /api/analyse/result/{job_uid}) into a plain view model, for the
 * card or the full report. No DOM and no network here, so it runs (and is tested) anywhere. The
 * wording mirrors the snapWONDERS report page, so every surface says the same thing.
 */

//  The result contract this renderer understands. A result with any newer version, minor too, gets a
//  non-blocking "new version available" note; everything this renderer knows is still drawn.
export const SUPPORTED_SCHEMA_MAJOR = 1;
export const SUPPORTED_SCHEMA_MINOR = 5;
export const SUPPORTED_SCHEMA = `${SUPPORTED_SCHEMA_MAJOR}.${SUPPORTED_SCHEMA_MINOR}`;

//  Where the note links unless the host (extension, plugin, app) passes its own release notes
export const DEFAULT_RELEASE_NOTES_URL = 'https://github.com/snapWONDERS/snapWONDERS-Report/blob/main/CHANGELOG.md';

/**
 * True when a result is newer than this renderer (any bump, minor too) or its version is unreadable.
 */
export function isNewerSchema(version) {
    if (version === null) return true;
    if (version.major !== SUPPORTED_SCHEMA_MAJOR) return version.major > SUPPORTED_SCHEMA_MAJOR;
    return version.minor > SUPPORTED_SCHEMA_MINOR;
}

//  The update note's wording: gentle for a minor bump (fields only added), firmer for a major one
//  (a field changed meaning or was removed) or an unreadable version (owner 2026-11-20)
export const UPDATE_NOTE = Object.freeze({
    minor: 'A new version is available, with more in this report.',
    major: 'Update needed: this report comes from a newer snapWONDERS version, so some parts may be missing or shown wrongly.',
});

/**
 * The update note for a result, or null when none is due. The note is dismissable: the host keeps the
 * version the user dismissed (`dismissedUpdate`, e.g. in extension storage) and the note stays hidden
 * for that version and older ones, and comes back on the next version.
 */
function updateNote(version, dismissedUpdate) {
    if (!isNewerSchema(version)) return null;
    const level = version === null || version.major > SUPPORTED_SCHEMA_MAJOR ? 'major' : 'minor';
    const dismissed = typeof dismissedUpdate === 'string' ? parseSchemaVersion(dismissedUpdate) : null;
    if (version !== null && dismissed !== null
        && (dismissed.major > version.major || (dismissed.major === version.major && dismissed.minor >= version.minor))) {
        return null;
    }
    return {
        level,
        text: UPDATE_NOTE[level],
        schemaVersion: version === null ? null : `${version.major}.${version.minor}`,
    };
}

//  Grade words, as on the report page
export const GRADE_WORDS = Object.freeze({
    A: 'Nothing significant found',
    B: 'Low risk',
    C: 'Moderate risk',
    D: 'High risk',
    F: 'Critical',
});

export const CONFIDENCE_WORDS = Object.freeze({ high: 'High', medium: 'Medium', low: 'Low' });

//  AI generation verdicts, as on the report page's AI card
export const AI_VERDICT_WORDS = Object.freeze({
    likely_authentic: 'Verified camera capture',
    likely_real:      'Likely real (camera signals)',
    real_edited:      'Real capture, edited',
    no_evidence:      'No AI-generation evidence found',
    inconclusive:     'Inconclusive',
    ai_edited:        'AI-edited',
    ai_processed:     'Processed by an AI image generator',
    possible_aigc:    'Possible AI generation',
    declared_ai:      'Declared AI-generated or AI-edited',
});

export const PIXEL_ANALYSIS_WORDS = Object.freeze({
    flagged:        'Signs of AI generation detected',
    clear:          'No signs found at this image quality',
    not_assessable: 'Not yet calibrated for this file type or size',
});

//  Hidden content — never names the checks that ran
export const HIDDEN_CONTENT_WORDS = Object.freeze({
    not_analysed:                  'Not checked',
    none:                          'Nothing found by the checks that ran',
    anomalies:                     'Irregularities found — not conclusive on their own',
    unusual_reading:               'An unusual reading — not evidence of hidden content',
    watermark_pattern_unconfirmed: 'A pattern was flagged but not confirmed',
    generator_watermark_matched:   'A known AI image generator watermark was found',
});

export const CHECK_WORDS = Object.freeze({
    clean:    'Nothing found',
    possible: 'Possible signs found',
    suspect:  'Signs found',
});

//  Analysis images the full report shows, in order, with their titles
export const IMAGE_TITLES = Object.freeze({
    display_image:        'Your file',
    face_map:             'Faces found',
    text_map:             'Readable text found',
    forensic_ela:         'Error Level Analysis',
    forensic_ela_anomaly: 'Error Level Analysis — areas that stand out',
    forensic_noise_map:   'Noise map',
    forensic_clone:       'Copied areas',
});

//  Evidence maps, in the web report's order, with its titles and the line each panel opens with.
//  The NSS chart is not a map, but sits in the same group (approved design). Never the ghost curve.
export const EVIDENCE_MAPS = Object.freeze({
    forensic_roi:         { title: 'Regions', text: 'Boxes show areas where a check found something. Each box has a number. A box is something to look at, not proof of editing.' },
    forensic_noise_field: { title: 'Noise', text: 'Colour shows areas with less camera grain than expected. Stronger colour means less grain. Smooth things like sky, water and skin can show colour on their own.' },
    forensic_ela_field:   { title: 'Compression', text: 'Colour shows areas that change differently when the photo is saved again. Sharp edges and text often differ. Look for a solid patch that stands out from what is around it.' },
    forensic_dct_map:     { title: 'Save history', text: 'This photo was saved as a JPEG more than once. Colour shows areas that do not share that save history, as a part pasted in from another picture often does. Many edits do not show here, and busy detail can show colour on its own.' },
    forensic_nss_chart:   { title: 'Natural Scene Statistics Check', text: null },
    forensic_ghost_map:   { title: 'Earlier save', text: 'Colour marks an area that looks like it was saved as a JPEG at a lower quality before the rest of the photo. A piece pasted in from another photo can do this. Smooth, very bright and very dark areas cannot be read.' },
    forensic_camera_map:  { title: 'Since the camera', text: 'Your camera saved a small preview inside the file when the photo was taken. Colour marks areas that now look different from that preview. Something added or removed after the photo was taken can show here. Many editing apps replace the preview, and then nothing shows. This is evidence, not a verdict.' },
});

//  The maps replace these older pictures, as on the web report
const REPLACED_BY_MAPS = Object.freeze(['forensic_ela', 'forensic_ela_anomaly', 'forensic_noise_map']);

export const EVIDENCE_INTRO = 'These maps look for signs of editing only. Your grade also looks at AI, origin and metadata. A quiet map does not mean a good grade.';
export const NO_REGIONS     = 'No check marked an area in this photo. This is not proof the photo is unedited. Some edits leave no trace these checks can see.';
export const NO_REGIONS_DCT = 'No check flagged an area in this photo. The Save history map below shows colour on its own terms. This is not proof the photo is unedited. Some edits leave no trace these checks can see.';

//  The five categories behind the two grades, in the web report's order
export const CATEGORY_WORDS = Object.freeze({
    origin: 'Origin', manipulation: 'Manipulation', ai_generation: 'AI generation',
    privacy: 'Privacy', security: 'Security',
});

//  "Also noted" (schema 1.3), worded as the web report's box under each category
export const ALSO_NOTED_TITLE = 'Also noted - not used for your grade';
export function alsoNotedText(media) {
    return `These checks picked something up, but they do the same on most ${media === 'video' ? 'videos' : 'photos'}, including untouched ones. On their own they tell us very little, so they don't change your grade.`;
}

//  When, where and what took it (schema 1.4): the line tags, as on the web report's card
export const CAPTURE_LINES   = Object.freeze(['when', 'where', 'what', 'apps']);
export const CAPTURE_SOURCES = Object.freeze({
    file:        'From the file',
    file_name:   'Inferred from the file name',
    fingerprint: 'Inferred from the compression',
});
export const CAPTURE_TITLE = 'When, where and what took it';
export const MAP_LINK_TEXT = 'View on map';
const OSM_CREDIT_URL       = 'https://www.openstreetmap.org/copyright';

//  "Since the camera": the preview stored in the file does not line up with the photo
export const CAMERA_NO_MATCH = "The camera's preview does not match this photo. This can happen when a photo is heavily changed or swapped, or when an app crops or rotates it. This is evidence, not a verdict.";

export const PARTIAL_CARD ="some checks couldn't run.";
export const PARTIAL_FULL = "some checks couldn't run, so this isn't a clean bill of health.";
export const SOFTENED     = "Softened by a step because we're less sure about this finding.";
export const WARNING_TAIL = "We've eased this grade because we're not sure. Check the matching card in the report below before relying on it.";

//  Findings are listed most serious first; the card shows the top few
export const SEVERITY_ORDER = Object.freeze({ critical: 0, high: 1, medium: 2, low: 3, info: 4 });
export const MAX_FINDINGS   = 5;

//  Attribution links are drawn only when they point at snapWONDERS
export const ATTRIBUTION_HOSTS = Object.freeze(['snapwonders.com']);

//  Link parameters a host may add to the attribution links (e.g. ?src=wp&site=…)
export const LINK_PARAM_KEYS = Object.freeze(['src', 'site', 'r']);

/**
 * Reads `schema_version` ("major.minor"). A result from before versioning carries none and is the
 * 1.0 contract. Anything unreadable returns null.
 */
export function parseSchemaVersion(value) {
    if (value === undefined || value === null) {
        return { major: 1, minor: 0 };
    }
    const match = /^(\d+)\.(\d+)$/.exec(String(value));
    if (!match) {
        return null;
    }
    return { major: Number(match[1]), minor: Number(match[2]) };
}

/**
 * Parses a host's link parameters ("src=wp&site=abc") keeping only the allowed keys and plain
 * values, so nothing a host passes can turn a snapWONDERS link into something else.
 */
export function parseLinkParams(value) {
    const out = [];
    if (typeof value !== 'string' || value === '') {
        return out;
    }
    for (const pair of value.split('&')) {
        const [key, val] = pair.split('=');
        if (LINK_PARAM_KEYS.includes(key) && typeof val === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(val)) {
            out.push([key, val]);
        }
    }
    return out;
}

/** An https link on a snapWONDERS host, with the host's link parameters added; otherwise null. */
export function snapwondersLink(value, linkParams = []) {
    let url;
    try {
        url = new URL(String(value));
    } catch {
        return null;
    }
    const host = url.hostname.toLowerCase();
    const ours = ATTRIBUTION_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
    if (url.protocol !== 'https:' || !ours || url.username || url.password) {
        return null;
    }
    for (const [key, val] of linkParams) {
        url.searchParams.set(key, val);
    }
    return url.href;
}

function has(map, key) {
    return typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key);
}

//  Which file was checked (schema 1.5): one line, drawn word for word. Missing or unreadable: no line.
function checkedFile(result) {
    const block = result.checked_file;
    if (!block || typeof block !== 'object' || typeof block.text !== 'string' || block.text.trim() === '') {
        return null;
    }
    return { kind: typeof block.kind === 'string' ? block.kind : null, text: block.text.trim() };
}

function textLink(block, linkParams) {
    if (!block || typeof block !== 'object' || typeof block.text !== 'string' || block.text === '') {
        return null;
    }
    const url = snapwondersLink(block.url, linkParams);
    return url ? { text: block.text, url } : null;
}

//  Why a headline grade is what it is (schema 1.2). Missing or unreadable: nothing is said.
function explained(file, kind) {
    const e = file.explanation && typeof file.explanation === 'object' ? file.explanation[kind] : null;
    if (!e || typeof e !== 'object') {
        return { weakestArea: null, softened: false, warnings: [], notAssessed: false };
    }
    return {
        weakestArea: has(CATEGORY_WORDS, e.decided_by) ? CATEGORY_WORDS[e.decided_by] : null,
        softened:    e.softened === true,
        warnings:    Array.isArray(e.warnings) ? e.warnings.filter((w) => typeof w === 'string' && w.trim() !== '').map((w) => w.trim()) : [],
        notAssessed: Array.isArray(e.not_assessed) && e.not_assessed.some((c) => has(CATEGORY_WORDS, c)),
    };
}

//  A check's label as a list item: the report's row labels are questions ("Noise level inconsistency?")
function itemLabel(value) {
    return typeof value === 'string' ? value.trim().replace(/\?+$/, '').trim() : '';
}

//  The five categories, each with its reasons and (1.3) the checks only noted. Full mode only.
function categories(file) {
    const c = file.explanation && file.explanation.categories && typeof file.explanation.categories === 'object' ? file.explanation.categories : {};
    return Object.keys(CATEGORY_WORDS)
        .filter((k) => c[k] && typeof c[k] === 'object' && has(GRADE_WORDS, c[k].grade))
        .map((k) => ({
            name:      CATEGORY_WORDS[k],
            grade:     c[k].grade,
            reasons:   (Array.isArray(c[k].reasons) ? c[k].reasons : [])
                .filter((r) => r && itemLabel(r.label) !== '')
                .map((r) => ({ label: itemLabel(r.label), reassuring: r.effect === 'reassuring' })),
            alsoNoted: (Array.isArray(c[k].also_noted) ? c[k].also_noted : [])
                .map((r) => (r ? itemLabel(r.label) : ''))
                .filter((l) => l !== ''),
        }));
}

/**
 * The evidence maps the host supplies, in order, with what each shows. When no map marks an area,
 * the report says so, and that it is not proof of an unedited photo: an absent Regions map is never
 * shown as a clean result.
 */
function evidenceMaps(file, assetUrl) {
    if (typeof assetUrl !== 'function' || !Array.isArray(file.assets)) {
        return null;
    }
    const isImage = (a) => a && typeof a.mime_type === 'string' && a.mime_type.startsWith('image/');
    const order   = Object.keys(EVIDENCE_MAPS);
    const maps    = file.assets
        .filter((a) => isImage(a) && has(EVIDENCE_MAPS, a.category))
        .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
        .map((a) => ({ category: a.category, ...EVIDENCE_MAPS[a.category], src: assetUrl(a) }))
        .filter((m) => typeof m.src === 'string' && m.src !== '');

    //  Since the camera (schema 1.4): whether the map marked anything, and whether the preview lined up
    const cam      = file.verdicts && file.verdicts.forensic && file.verdicts.forensic.camera_map;
    const camKnown = cam && typeof cam === 'object' && typeof cam.marked === 'boolean';
    let noMatch    = null;
    if (cam && cam.matched === false) {
        const thumb = file.assets.find((a) => isImage(a) && a.category === 'exif_thumbnail');
        const src   = thumb ? assetUrl(thumb) : null;
        if (typeof src === 'string' && src !== '') {
            noMatch = { text: CAMERA_NO_MATCH, preview: { title: "The camera's preview, stored in the file", src } };
        }
    }
    if (!maps.length && !noMatch) {
        return null;
    }
    const shown = (c) => maps.some((m) => m.category === c);
    //  Before 1.4 a Since-the-camera map may have marked areas we cannot see, so it keeps the note off
    const camMarked = shown('forensic_camera_map') && (!camKnown || cam.marked === true);
    const marked    = shown('forensic_roi') || shown('forensic_ghost_map') || camMarked || noMatch !== null;
    return {
        intro: EVIDENCE_INTRO,
        note:  marked ? null : (shown('forensic_dct_map') ? NO_REGIONS_DCT : NO_REGIONS),
        noMatch,
        maps,
    };
}

//  A map link built from the numbers only, never from a name or a URL in the result
function mapUrl(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return null;
    }
    const la = lat.toFixed(5);
    const lo = lng.toFixed(5);
    return `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=15/${la}/${lo}`;
}

/**
 * When, where and what took it (schema 1.4): the web report's card, line for line. Null on older
 * results, where the section is hidden. `hideLocation` drops the Where line (public pages).
 */
function capture(file, full, hideLocation) {
    const c = file.capture;
    if (!c || typeof c !== 'object') {
        return null;
    }
    const str = (v) => (typeof v === 'string' ? v.trim() : '');
    const lines = [];
    for (const id of CAPTURE_LINES) {
        const l = c[id];
        if (!l || typeof l !== 'object' || str(l.label) === '' || str(l.value) === '') continue;
        if (id === 'where' && hideLocation) continue;
        const line = {
            id,
            label:    str(l.label),
            value:    str(l.value),
            why:      full && str(l.why) !== '' ? str(l.why) : null,
            recorded: l.recorded === true,
            sources:  full && Array.isArray(l.sources) ? [...new Set(l.sources.filter((s) => has(CAPTURE_SOURCES, s)))].map((s) => ({ key: s, text: CAPTURE_SOURCES[s] })) : [],
            map:      null,
            credit:   null,
        };
        if (id === 'where' && l.state === 'location') {
            line.map = mapUrl(l.lat, l.lng);
            //  OpenStreetMap's credit goes wherever the place is shown; only its own copyright page is linked
            const credit = l.credit && typeof l.credit === 'object' ? l.credit : null;
            line.credit = {
                text: credit && str(credit.text) !== '' ? str(credit.text) : 'Map data from OpenStreetMap',
                url:  OSM_CREDIT_URL,
            };
        }
        lines.push(line);
    }
    if (!lines.length) {
        return null;
    }
    //  Card only: when, where and the camera all say the same "not recorded", say it once
    const blank = lines.filter((l) => ['when', 'where', 'what'].includes(l.id) && !l.recorded);
    if (!full && blank.length === 3 && blank.every((l) => l.value === blank[0].value)) {
        const merged = { ...blank[0], id: 'when_where_what', label: blank.map((l) => l.label).join(' · ') };
        lines.splice(lines.indexOf(blank[0]), 3, merged);
    }
    return { title: CAPTURE_TITLE, lines, tip: full && str(c.tip) !== '' ? str(c.tip) : null };
}

function headline(kind, grade, confidence, file = {}) {
    const graded = has(GRADE_WORDS, grade);
    const why    = graded ? explained(file, kind) : explained({}, kind);
    const flag   = file[kind === 'authenticity' ? 'grade_partial_coverage' : 'exposure_partial_coverage'] === true;
    return {
        weakestArea:   why.weakestArea,
        softened:      why.softened,
        warnings:      why.warnings,
        partial:       graded && (flag || why.notAssessed),
        kind,
        title:         kind === 'authenticity' ? 'Authenticity' : 'Exposure',
        question:      kind === 'authenticity' ? 'Has this file been edited or AI-generated?' : 'What does this file give away?',
        grade:         graded ? grade : null,
        word:          graded ? GRADE_WORDS[grade] : "Couldn't tell",
        note:          graded ? null : "We couldn't check this side of the file. That isn't the same as a clean result.",
        confidence:    graded && has(CONFIDENCE_WORDS, confidence) ? CONFIDENCE_WORDS[confidence] : null,
        lowConfidence: graded && confidence === 'low',
    };
}

function plural(n, one, many) {
    return `${n} ${n === 1 ? one : many}`;
}

function evidence(file, full, version) {
    const rows     = [];
    const verdicts = file.verdicts && typeof file.verdicts === 'object' ? file.verdicts : {};

    //  AI generation, and the pixel analysis beside it
    const ai = verdicts.ai_generation;
    if (ai && has(AI_VERDICT_WORDS, ai.verdict)) {
        rows.push({ label: 'AI generation', value: AI_VERDICT_WORDS[ai.verdict] });
    }
    if (ai && has(PIXEL_ANALYSIS_WORDS, ai.pixel_analysis)) {
        rows.push({ label: 'Pixel analysis', value: PIXEL_ANALYSIS_WORDS[ai.pixel_analysis] });
    }

    //  Content Credentials (C2PA)
    const c2pa = verdicts.c2pa;
    if (c2pa && c2pa.has_manifest === true) {
        rows.push({ label: 'Content Credentials', value: c2pa.trusted === true ? 'Present, trusted signer' : 'Present, signer not verified' });
    } else if (full && c2pa && c2pa.has_manifest === false) {
        rows.push({ label: 'Content Credentials', value: 'None present' });
    }

    //  Faces — low-confidence detections are possible faces, never dropped
    if (Number.isInteger(file.face_count)) {
        const split = file.face_count_by_confidence;
        const low   = split && Number.isInteger(split.low) ? split.low : 0;
        const sure  = Math.max(0, file.face_count - low);
        const parts = [];
        if (sure > 0) parts.push(plural(sure, 'face', 'faces'));
        if (low > 0) parts.push(plural(low, 'possible face', 'possible faces'));
        rows.push({ label: 'Faces', value: parts.length ? parts.join(', ') : 'None found' });
    }

    //  Readable text
    if (Number.isInteger(file.text_region_count)) {
        rows.push({ label: 'Readable text', value: file.text_region_count === 0 ? 'None found' : plural(file.text_region_count, 'area', 'areas') });
    }

    //  Watermark — the web report's top-card wording, sent by the API as a label
    const wm = verdicts.watermark;
    if (wm && typeof wm.label === 'string' && wm.label.trim() !== '') {
        rows.push({ label: 'Watermark', value: wm.label.trim() });
    }

    if (!full) {
        return rows;
    }

    //  Hidden content
    const stego = verdicts.steganography;
    if (stego && has(HIDDEN_CONTENT_WORDS, stego.verdict)) {
        rows.push({ label: 'Hidden content', value: HIDDEN_CONTENT_WORDS[stego.verdict] });
    }

    //  Encoder fingerprint
    const fp = verdicts.camera_fingerprint;
    if (fp && fp.applicable === true) {
        const name = typeof fp.encoder_name === 'string' && fp.encoder_name !== '' ? fp.encoder_name : null;
        rows.push({ label: 'Encoder fingerprint', value: fp.matched === true ? (name ? `Matches ${name}` : 'Matched') : 'No known match' });
    }

    //  Compression and noise differences — counts only
    const ela = verdicts.forensic && verdicts.forensic.ela;
    if (ela && typeof ela.high_fraction === 'number' && ela.high_fraction >= 0 && ela.high_fraction <= 1) {
        rows.push({ label: 'Compression differences', value: `${Math.round(ela.high_fraction * 100)}% of the image` });
    }
    //  Noise differences: only from schema 1.2, where anomaly_tile_count counts the same tiles as the
    //  web report. Before 1.2 it was an older count that could contradict the Regions map.
    const noise = verdicts.forensic && verdicts.forensic.noise_inconsistency;
    const sameCountAsWeb = version !== null && (version.major > 1 || version.minor >= 2);
    if (sameCountAsWeb && noise && Number.isInteger(noise.anomaly_tile_count)) {
        rows.push({ label: 'Noise differences', value: noise.anomaly_tile_count === 0 ? 'None found' : plural(noise.anomaly_tile_count, 'area', 'areas') });
    }

    //  Video and audio checks
    const audio = verdicts.audio_splice;
    if (audio && has(CHECK_WORDS, audio.verdict)) {
        rows.push({ label: 'Audio edits', value: CHECK_WORDS[audio.verdict] });
    }
    const video = verdicts.video_tamper || {};
    if (video.inter_frame_tamper && has(CHECK_WORDS, video.inter_frame_tamper.verdict)) {
        rows.push({ label: 'Frame-to-frame edits', value: CHECK_WORDS[video.inter_frame_tamper.verdict] });
    }
    if (video.frame_duplicate && has(CHECK_WORDS, video.frame_duplicate.dup_verdict)) {
        rows.push({ label: 'Repeated frames', value: CHECK_WORDS[video.frame_duplicate.dup_verdict] });
    }
    return rows;
}

function findings(file, full) {
    const list  = file.verdicts && Array.isArray(file.verdicts.findings) ? file.verdicts.findings : [];
    const clean = list
        .filter((f) => f && typeof f.label === 'string' && f.label !== '')
        .map((f) => ({ label: f.label, severity: has(SEVERITY_ORDER, f.severity) ? f.severity : 'info' }))
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    const cap = full ? clean.length : MAX_FINDINGS;
    return { shown: clean.slice(0, cap), more: Math.max(0, clean.length - cap) };
}

/**
 * The analysis images, in display order. The renderer never fetches anything itself: the host's
 * `assetUrl(asset)` maps each asset to where the host keeps it (its own server, its uploads
 * folder). Assets it returns nothing for are left out.
 */
function images(file, assetUrl, mapsShown) {
    if (typeof assetUrl !== 'function' || !Array.isArray(file.assets)) {
        return [];
    }
    const order = Object.keys(IMAGE_TITLES);
    return file.assets
        .filter((a) => a && has(IMAGE_TITLES, a.category) && typeof a.mime_type === 'string' && a.mime_type.startsWith('image/'))
        .filter((a) => !(mapsShown && REPLACED_BY_MAPS.includes(a.category)))
        .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
        .map((a) => ({ title: IMAGE_TITLES[a.category], category: a.category, src: assetUrl(a) }))
        .filter((i) => typeof i.src === 'string' && i.src !== '');
}

/**
 * Builds the view model.
 *
 * @param {object} result  the JSON from GET /api/analyse/result/{job_uid}
 * @param {{fileIndex?: number, mode?: 'card'|'full', assetUrl?: function, linkParams?: string}} [options]
 * @returns {object}  `{ok: false, message}` when there is nothing to show
 */
export function buildCardModel(result, options = {}) {
    if (!result || typeof result !== 'object' || !Array.isArray(result.files)) {
        return { ok: false, message: 'No result to show.' };
    }
    const fileIndex = Number.isInteger(options.fileIndex) ? options.fileIndex : 0;
    const file      = result.files[fileIndex];
    if (!file || typeof file !== 'object') {
        return { ok: false, message: 'No result to show.' };
    }
    const full       = options.mode === 'full';
    const linkParams = parseLinkParams(options.linkParams);
    const version    = parseSchemaVersion(result.schema_version);
    const maps       = full ? evidenceMaps(file, options.assetUrl) : null;
    const media      = file.verdicts && file.verdicts.video_tamper ? 'video' : 'photo';
    return {
        ok:              true,
        mode:            full ? 'full' : 'card',
        updateAvailable: isNewerSchema(version),
        //  Null when none is due or the user dismissed it for this version
        update:          updateNote(version, options.dismissedUpdate),
        name:            typeof file.name === 'string' ? file.name : '',
        //  Schema 1.5: the line at the top saying which file was checked, and the full report on snapWONDERS
        checkedFile:     checkedFile(result),
        reportUrl:       result.report_url ? snapwondersLink(result.report_url, linkParams) : null,
        headlines: [
            headline('authenticity', file.grade, file.confidence, file),
            headline('exposure', file.exposure_grade, file.exposure_confidence, file),
        ],
        capture:      capture(file, full, options.hideLocation === true),
        evidence:     evidence(file, full, version),
        findings:     findings(file, full),
        categories:   full ? categories(file) : [],
        alsoNoted:    { title: ALSO_NOTED_TITLE, text: alsoNotedText(media) },
        evidenceMaps: maps,
        images:       full ? images(file, options.assetUrl, maps !== null && maps.maps.some((m) => m.category !== 'forensic_nss_chart')) : [],
        //  Service output only (schema 1.1): the renderer never adds a credit of its own
        attribution: textLink(result.attribution, linkParams),
        vaultifyCta: textLink(file.vaultify_cta, linkParams),
    };
}
