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
 * <snapwonders-report> — draws one analyse result as a card.
 *
 *   el.result = json;                         // the JSON from GET /api/analyse/result/{job_uid}
 *   <snapwonders-report report-url="…">       // adds "Open full report" (else the result's report_url, schema 1.5)
 *     <script type="application/json">{…}</script>   // or the result inline (static pages)
 *   </snapwonders-report>
 *
 * Attributes: mode ("card" or "full"), report-url, file-index, link-params ("src=wp&site=…", added to the
 *             snapWONDERS links), check-another (adds a "Check another" button), hide-location (leaves out
 *             where the file was taken: set it on public pages unless the owner chose to show it),
 *             release-notes-url (where "See what's new" links when a result is newer than this renderer;
 *             the extension or plugin passes its own release notes, else the renderer's changelog).
 * Property:   assetUrl = (asset) => url — full mode only: where the host keeps each analysis image. The
 *             renderer makes no network calls of its own.
 *             dismissed-update (the result version whose update note the user dismissed; the host keeps it,
 *             e.g. in extension storage, so the note stays hidden for that version and returns on the next).
 * Events: snapwonders-check-another; snapwonders-update-available (result newer than this renderer,
 *         detail { level: 'minor' | 'major', schemaVersion }); snapwonders-update-dismissed (detail
 *         { schemaVersion }: store it and pass it back as dismissed-update).
 * Attribution and the snapWONDERS Vaultify link come from the result itself (schema 1.1) and are drawn
 * only when they point at snapwonders.com; the renderer never adds a credit of its own.
 * Theming: --sw-font, --sw-bg, --sw-text, --sw-muted, --sw-border, --sw-accent, --sw-radius.
 *
 * Every value is written with textContent — nothing from a result is ever parsed as HTML.
 */

import { buildCardModel, DEFAULT_RELEASE_NOTES_URL, SOFTENED, WARNING_TAIL, PARTIAL_CARD, PARTIAL_FULL, MAP_LINK_TEXT } from './model.js';

//  Grade colours, as on the report page
const GRADE_COLOURS = {
    A: ['#dcfce7', '#166534', '#86efac'],
    B: ['#ccfbf1', '#115e59', '#5eead4'],
    C: ['#fef3c7', '#92400e', '#fcd34d'],
    D: ['#ffedd5', '#9a3412', '#fdba74'],
    F: ['#fee2e2', '#991b1b', '#fca5a5'],
};

const STYLES = `
:host { display: block; font-family: var(--sw-font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
        color: var(--sw-text, #111827); max-width: 34rem; }
.card { background: var(--sw-bg, #fff); border: 1px solid var(--sw-border, #e5e7eb); border-radius: var(--sw-radius, 14px);
        padding: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
.checked { font-size: .85rem; color: var(--sw-text, #111827); background: var(--sw-bg, #ffffff); border: 1px solid var(--sw-border, #e5e7eb); border-radius: 8px; padding: .45rem .65rem; margin: 0 0 .75rem; }
.name { font-size: .8rem; color: var(--sw-muted, #4b5563); margin: 0 0 .75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.update { font-size: .8rem; background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; border-radius: 8px; padding: .4rem .6rem; margin-bottom: .75rem; display: flex; gap: .5rem; align-items: flex-start; }
.update.major { background: #fffbeb; border-color: #fcd34d; color: #92400e; font-weight: 600; }
.update > span { flex: 1; }
.update-close { font: inherit; background: none; border: 0; color: inherit; cursor: pointer; padding: 0 .2rem; line-height: 1; }
.grades { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
@media (max-width: 26rem) { .grades { grid-template-columns: 1fr; } }
.tile { border: 1px solid var(--sw-border, #e5e7eb); border-radius: 10px; padding: .7rem; }
.tile-head { display: flex; justify-content: space-between; gap: .5rem; align-items: flex-start; }
.title { font-size: .7rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; margin: 0; }
.question { font-size: .75rem; color: var(--sw-muted, #4b5563); margin: .15rem 0 0; }
.letter { flex: none; width: 2.4rem; height: 2.4rem; border: 2px solid; border-radius: 9px; display: flex; align-items: center;
          justify-content: center; font-weight: 800; font-size: 1.35rem; }
.letter.none { border-style: dashed; border-color: #d1d5db; color: #6b7280; }
.word { font-size: .95rem; font-weight: 700; margin: .5rem 0 0; }
.sure { font-size: .75rem; color: var(--sw-muted, #4b5563); margin: .1rem 0 0; }
.warn { font-size: .75rem; background: #fffbeb; border: 1px solid #fcd34d; color: #78350f; border-radius: 7px; padding: .3rem .45rem; margin-top: .4rem; }
.rows { margin: .9rem 0 0; display: grid; grid-template-columns: auto 1fr; gap: .3rem .8rem; font-size: .85rem; }
.rows dt { color: var(--sw-muted, #4b5563); }
.rows dd { margin: 0; font-weight: 600; }
h3 { font-size: .8rem; margin: .9rem 0 .35rem; }
ul { list-style: none; margin: 0; padding: 0; font-size: .85rem; }
li { display: flex; gap: .5rem; align-items: baseline; padding: .15rem 0; }
.sev { flex: none; font-size: .65rem; font-weight: 700; text-transform: uppercase; border-radius: 5px; padding: .05rem .35rem; background: #f3f4f6; color: #374151; }
.sev.critical, .sev.high { background: #fee2e2; color: #991b1b; }
.sev.medium { background: #fef3c7; color: #92400e; }
.more { font-size: .75rem; color: var(--sw-muted, #4b5563); margin-top: .25rem; }
.actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1rem; }
.btn { font: inherit; font-size: .85rem; font-weight: 600; border-radius: 9px; padding: .5rem .85rem; cursor: pointer; text-decoration: none;
       border: 1px solid var(--sw-accent, #4f46e5); }
.btn.primary { background: var(--sw-accent, #4f46e5); color: #fff; }
.btn.secondary { background: transparent; color: var(--sw-accent, #4f46e5); }
.btn:focus-visible { outline: 2px solid var(--sw-accent, #4f46e5); outline-offset: 2px; }
.foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .5rem; margin-top: .9rem; padding-top: .7rem;
        border-top: 1px solid var(--sw-border, #e5e7eb); font-size: .75rem; color: var(--sw-muted, #4b5563); }
.foot a { color: var(--sw-accent, #4f46e5); }
.empty { font-size: .85rem; color: var(--sw-muted, #4b5563); }
.cta { margin-top: .9rem; font-size: .85rem; background: #f5f3ff; border: 1px solid #ddd6fe; color: #4c1d95; border-radius: 9px; padding: .55rem .7rem; }
.cta a { color: #6d28d9; font-weight: 600; }
.images { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: .7rem; margin-top: .4rem; }
figure { margin: 0; }
figure img { width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--sw-border, #e5e7eb); background: #f9fafb; }
figcaption { font-size: .75rem; color: var(--sw-muted, #4b5563); margin-top: .25rem; }
.warn-head { font-weight: 600; margin: 0; }
.warn-tail { margin: .15rem 0 0; }
.partial { color: #92400e; font-weight: 600; }
.cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); gap: .5rem; }
.cat { border: 1px solid var(--sw-border, #e5e7eb); border-radius: 10px; padding: .55rem .7rem; }
.cat-head { display: flex; gap: .5rem; align-items: center; font-weight: 600; margin: 0; }
.cat-letter { display: inline-flex; align-items: center; justify-content: center; width: 1.6rem; height: 1.6rem; border: 1px solid; border-radius: 6px; font-weight: 700; }
.reasons { margin: .35rem 0 0 2.1rem; font-size: .8rem; }
.reasons li { display: list-item; padding: .1rem 0; }
.noted { margin-top: .5rem; padding: .45rem .6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: .75rem; color: #475569; }
.noted p { margin: .1rem 0 0; }
.noted .noted-title { font-weight: 700; color: #334155; margin: 0; }
.noted .noted-why { color: #64748b; margin-top: .25rem; }
.capture { margin-top: .75rem; border: 1px solid var(--sw-border, #e5e7eb); border-radius: 10px; padding: .6rem .75rem; }
.cap-line + .cap-line { margin-top: .55rem; padding-top: .55rem; border-top: 1px solid #f3f4f6; }
.cap-label { font-size: .68rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--sw-muted, #6b7280); margin: 0; }
.cap-value { font-size: .9rem; font-weight: 600; margin: .1rem 0 0; }
.cap-value.unrecorded { color: var(--sw-muted, #6b7280); }
.cap-tags { display: flex; flex-wrap: wrap; gap: .3rem; margin: .25rem 0; }
.cap-tag { font-size: .68rem; font-weight: 600; border-radius: 999px; padding: .05rem .5rem; background: #fffbeb; color: #92400e; box-shadow: inset 0 0 0 1px #fcd34d; }
.cap-tag.file { background: #eef2ff; color: #4338ca; box-shadow: inset 0 0 0 1px #c7d2fe; }
.cap-map { display: flex; flex-wrap: wrap; gap: .3rem .9rem; font-size: .75rem; margin: .2rem 0 0; }
.cap-map a { color: var(--sw-accent, #4f46e5); font-weight: 600; }
.cap-map a.cap-credit { color: var(--sw-muted, #6b7280); font-weight: 400; }
.cap-tip { font-size: .78rem; background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; border-radius: 8px; padding: .4rem .6rem; margin: .6rem 0 0; }
.nomatch { font-size: .8rem; font-weight: 500; background: #fff7ed; border: 1px solid #fed7aa; color: #7c2d12; border-radius: 8px; padding: .4rem .6rem; }
.preview { max-width: 14rem; margin-top: .4rem; }
.ev-head { display: flex; gap: .5rem; align-items: center; }
.badge { font-size: .7rem; font-weight: 500; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; border-radius: 999px; padding: .05rem .5rem; }
.ev-note { font-size: .8rem; margin: .4rem 0 0; }
.maps { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: .8rem; margin-top: .5rem; }
.maps figure img { background: #111827; }
.maps figcaption strong { display: block; color: var(--sw-text, #111827); font-size: .8rem; }
.map-text { display: block; margin-top: .15rem; }
:host([mode="full"]) { max-width: 60rem; }
`;

//  Small DOM helper — text only, never HTML
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
}

function link(className, text, href) {
    const a = el('a', className, text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
}

//  Image sources from the host: http(s), blob: or a relative path — never another scheme
function safeImageSrc(value) {
    const s = String(value);
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
    return /^(https?|blob):/i.test(s) ? s : null;
}

function safeHttpUrl(value) {
    try {
        const url = new URL(String(value));
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch {
        return null;
    }
}

function letterBox(className, grade) {
    const box = el('span', className, grade);
    const [bg, fg, border] = GRADE_COLOURS[grade];
    box.style.background = bg;
    box.style.color = fg;
    box.style.borderColor = border;
    box.setAttribute('aria-hidden', 'true');
    return box;
}

function renderTile(h, full) {
    const tile = el('section', 'tile');
    tile.setAttribute('aria-label', `${h.title} grade`);
    const head = el('div', 'tile-head');
    const text = el('div');
    text.append(el('p', 'title', h.title), el('p', 'question', h.question));
    const letter = el('div', h.grade ? 'letter' : 'letter none', h.grade ?? '—');
    if (h.grade) {
        const [bg, fg, border] = GRADE_COLOURS[h.grade];
        letter.style.background = bg;
        letter.style.color = fg;
        letter.style.borderColor = border;
    }
    letter.setAttribute('aria-hidden', 'true');
    head.append(text, letter);
    tile.append(head, el('p', 'word', h.word));
    if (h.confidence) tile.append(el('p', 'sure', `How sure we are: ${h.confidence}`));
    if (h.note) tile.append(el('p', 'sure', h.note));
    //  Full view, in the web report's order: weakest area, softened or warnings, partial coverage
    if (full && h.weakestArea) tile.append(el('p', 'sure', `Weakest area: ${h.weakestArea}`));
    if (full && h.softened && !h.warnings.length) tile.append(el('p', 'sure', SOFTENED));
    if (full) {
        h.warnings.forEach((w) => {
            const box = el('div', 'warn');
            box.setAttribute('role', 'note');
            box.append(el('p', 'warn-head', `⚠ ${w}`), el('p', 'warn-tail', WARNING_TAIL));
            tile.append(box);
        });
    }
    if (h.lowConfidence && !(full && h.warnings.length)) tile.append(el('p', 'warn', 'Low confidence. Open the full report before relying on it.'));
    if (h.partial) {
        const p = el('p', 'sure');
        p.append(el('strong', 'partial', full ? 'Partial coverage' : 'Partly checked'), document.createTextNode(` — ${full ? PARTIAL_FULL : PARTIAL_CARD}`));
        tile.append(p);
    }
    return tile;
}

//  Why these grades: one box per category, its reasons, and the checks only noted (full view)
function renderCategories(model) {
    const wrap = el('div', 'cats');
    model.categories.forEach((c) => {
        const box = el('section', 'cat');
        box.setAttribute('aria-label', `${c.name} grade ${c.grade}`);
        const head = el('p', 'cat-head');
        head.append(letterBox('cat-letter', c.grade), el('span', null, c.name));
        box.append(head);
        if (c.reasons.length) {
            const ul = el('ul', 'reasons');
            c.reasons.forEach((r) => ul.append(el('li', null, r.label + (r.reassuring ? ' (reassuring)' : ''))));
            box.append(ul);
        }
        if (c.alsoNoted.length) {
            const noted = el('div', 'noted');
            noted.append(el('p', 'noted-title', model.alsoNoted.title), el('p', null, c.alsoNoted.join(', ')), el('p', 'noted-why', model.alsoNoted.text));
            box.append(noted);
        }
        wrap.append(box);
    });
    return wrap;
}

//  When, where and what took it: each line says where it comes from
function renderCapture(cap) {
    const part = el('section', 'capture');
    part.setAttribute('aria-label', cap.title);
    cap.lines.forEach((l) => {
        const line = el('div', 'cap-line');
        line.append(el('p', 'cap-label', l.label), el('p', l.recorded ? 'cap-value' : 'cap-value unrecorded', l.value));
        if (l.sources.length) {
            const tags = el('p', 'cap-tags');
            l.sources.forEach((s) => tags.append(el('span', `cap-tag ${s.key}`, s.text)));
            line.append(tags);
        }
        if (l.why) line.append(el('p', 'sure', l.why));
        if (l.map || l.credit) {
            const where = el('p', 'cap-map');
            if (l.map) where.append(link(null, `${MAP_LINK_TEXT} ›`, l.map));
            if (l.credit) where.append(link('cap-credit', l.credit.text, l.credit.url));
            line.append(where);
        }
        part.append(line);
    });
    if (cap.tip) part.append(el('p', 'cap-tip', cap.tip));
    return part;
}

//  Evidence maps, each with what it shows (full view)
function renderEvidenceMaps(ev) {
    const part = el('section', 'evidence');
    const head = el('h3', 'ev-head', 'Evidence maps ');
    head.append(el('span', 'badge', 'Evidence, not a verdict'));
    part.append(head, el('p', 'sure', ev.intro));
    if (ev.note) part.append(el('p', 'ev-note', ev.note));
    if (ev.noMatch) {
        part.append(el('p', 'nomatch', ev.noMatch.text));
        const src = safeImageSrc(ev.noMatch.preview.src);
        if (src) {
            const fig = el('figure', 'preview');
            const img = el('img');
            img.src = src;
            img.alt = ev.noMatch.preview.title;
            fig.append(img, el('figcaption', null, ev.noMatch.preview.title));
            part.append(fig);
        }
    }
    const grid = el('div', 'maps');
    ev.maps.forEach((m) => {
        const src = safeImageSrc(m.src);
        if (!src) return;
        const fig = el('figure');
        const img = el('img');
        img.src = src;
        img.alt = `Evidence map: ${m.title}`;
        img.loading = 'lazy';
        const cap = el('figcaption');
        cap.append(el('strong', null, m.title));
        if (m.text) cap.append(el('span', 'map-text', m.text));
        fig.append(img, cap);
        grid.append(fig);
    });
    part.append(grid);
    return part;
}

export function renderCard(model, options = {}) {
    const card = el('article', 'card');
    if (!model.ok) {
        card.append(el('p', 'empty', model.message));
        return card;
    }
    if (model.update) {
        //  Non-blocking and dismissable: the rest of the card is still drawn from what this version understands
        const note = el('p', `update ${model.update.level}`);
        note.setAttribute('role', 'status');
        const words = el('span', null, `${model.update.text} `);
        const notes = safeHttpUrl(options.releaseNotesUrl) ?? DEFAULT_RELEASE_NOTES_URL;
        words.append(link('update-link', 'See what’s new', notes));
        note.append(words);
        if (options.onDismissUpdate) {
            const close = el('button', 'update-close', '×');
            close.type = 'button';
            close.setAttribute('aria-label', 'Dismiss');
            close.addEventListener('click', () => options.onDismissUpdate(model.update.schemaVersion));
            note.append(close);
        }
        card.append(note);
    }
    if (model.name) card.append(el('p', 'name', model.name));
    //  Which file was checked (schema 1.5), word for word from the result
    if (model.checkedFile) {
        const line = el('p', 'checked', model.checkedFile.text);
        if (model.checkedFile.kind) line.dataset.sourceKind = model.checkedFile.kind;
        card.append(line);
    }

    //  The two headline grades — never combined
    const grades = el('div', 'grades');
    model.headlines.forEach((h) => grades.append(renderTile(h, model.mode === 'full')));
    card.append(grades);

    //  When, where and what took it (schema 1.4)
    if (model.capture) card.append(renderCapture(model.capture));

    //  Evidence rows
    if (model.evidence.length) {
        const rows = el('dl', 'rows');
        model.evidence.forEach((r) => rows.append(el('dt', null, r.label), el('dd', null, r.value)));
        card.append(rows);
    }

    //  Key findings
    if (model.findings.shown.length) {
        card.append(el('h3', null, 'What we found'));
        const ul = el('ul');
        model.findings.shown.forEach((f) => {
            const li = el('li');
            li.append(el('span', `sev ${f.severity}`, f.severity), el('span', null, f.label));
            ul.append(li);
        });
        card.append(ul);
        if (model.findings.more) card.append(el('p', 'more', `+${model.findings.more} more in the full report`));
    }

    if (model.categories.length) {
        card.append(el('h3', null, 'Why these grades'), renderCategories(model));
    }
    if (model.evidenceMaps) {
        card.append(renderEvidenceMaps(model.evidenceMaps));
    }

    //  Analysis images (full mode)
    if (model.images.length) {
        card.append(el('h3', null, 'Analysis images'));
        const grid = el('div', 'images');
        model.images.forEach((img) => {
            const src = safeImageSrc(img.src);
            if (!src) return;
            const fig = el('figure');
            const tag = el('img');
            tag.src = src;
            tag.alt = img.title;
            tag.loading = 'lazy';
            fig.append(tag, el('figcaption', null, img.title));
            grid.append(fig);
        });
        card.append(grid);
    }

    //  The snapWONDERS Vaultify call to action, from the result
    if (model.vaultifyCta) {
        const cta = el('p', 'cta', `${model.vaultifyCta.text} `);
        cta.append(link(null, 'Hide it →', model.vaultifyCta.url));
        card.append(cta);
    }

    //  Actions
    const actions = el('div', 'actions');
    //  The host's report-url wins; otherwise the result's own report_url (schema 1.5)
    const reportUrl = options.reportUrl ? safeHttpUrl(options.reportUrl) : model.reportUrl;
    if (reportUrl) actions.append(link('btn primary', 'Open full report', reportUrl));
    if (options.onCheckAnother) {
        const again = el('button', 'btn secondary', 'Check another');
        again.type = 'button';
        again.addEventListener('click', options.onCheckAnother);
        actions.append(again);
    }
    if (actions.childNodes.length) card.append(actions);

    //  Attribution, from the result
    if (model.attribution) {
        const foot = el('div', 'foot');
        foot.append(link(null, model.attribution.text, model.attribution.url));
        card.append(foot);
    }
    return card;
}

const Base = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

export class SnapwondersReport extends Base {
    static get observedAttributes() {
        return ['mode', 'report-url', 'file-index', 'link-params', 'check-another', 'hide-location', 'release-notes-url', 'dismissed-update'];
    }

    constructor() {
        super();
        this._result = null;
        this._assetUrl = null;
        this._updateAnnounced = false;
        this._dismissedHere = null;
        this.attachShadow({ mode: 'open' });
    }

    get result() {
        return this._result;
    }

    set result(value) {
        this._result = value;
        this._updateAnnounced = false;
        this._render();
    }

    get assetUrl() {
        return this._assetUrl;
    }

    set assetUrl(fn) {
        this._assetUrl = typeof fn === 'function' ? fn : null;
        if (this.isConnected) this._render();
    }

    connectedCallback() {
        //  A result can arrive inline as JSON data (static pages, e.g. WordPress)
        if (this._result === null) {
            const inline = this.querySelector('script[type="application/json"]');
            if (inline) {
                try {
                    this._result = JSON.parse(inline.textContent);
                } catch {
                    this._result = null;
                }
            }
        }
        this._render();
    }

    attributeChangedCallback() {
        if (this.isConnected) this._render();
    }

    _render() {
        const model = buildCardModel(this._result, {
            fileIndex:  Number.parseInt(this.getAttribute('file-index') ?? '0', 10) || 0,
            mode:       this.getAttribute('mode') === 'full' ? 'full' : 'card',
            assetUrl:   this._assetUrl,
            linkParams: this.getAttribute('link-params') ?? '',
            hideLocation: this.hasAttribute('hide-location'),
            dismissedUpdate: this.getAttribute('dismissed-update') ?? this._dismissedHere,
        });
        const style = document.createElement('style');
        style.textContent = STYLES;
        const card = renderCard(model, {
            reportUrl: this.getAttribute('report-url'),
            releaseNotesUrl: this.getAttribute('release-notes-url'),
            onDismissUpdate: (schemaVersion) => {
                //  Hide it here at once; the host stores the version so it stays hidden next time
                this._dismissedHere = schemaVersion ?? '999.999';
                this.dispatchEvent(new CustomEvent('snapwonders-update-dismissed', { bubbles: true, composed: true, detail: { schemaVersion } }));
                this._render();
            },
            onCheckAnother: this.hasAttribute('check-another')
                ? () => this.dispatchEvent(new CustomEvent('snapwonders-check-another', { bubbles: true, composed: true }))
                : null,
        });
        this.shadowRoot.replaceChildren(style, card);
        if (model.ok && model.updateAvailable && !this._updateAnnounced) {
            this._updateAnnounced = true;
            this.dispatchEvent(new CustomEvent('snapwonders-update-available', { bubbles: true, composed: true,
                detail: model.update ? { level: model.update.level, schemaVersion: model.update.schemaVersion } : null }));
        }
    }
}

export function defineSnapwondersReport(tagName = 'snapwonders-report') {
    if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
        customElements.define(tagName, SnapwondersReport);
    }
}
