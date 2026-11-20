<p align="center">
    <a href="https://www.snapwonders.com/" target="_blank">
        <img src="https://snapwonders.com/img/logo/snap-wonders-logo-big.png" width="172" alt="snapWONDERS" />
    </a>
</p>

snapWONDERS — Expose what's hidden. Hide what's yours.


# snapWONDERS Report — draw an analysis result in one tag

The snapWONDERS API returns a rich forensic result for every photo or video: two headline grades,
how sure we are, what the AI-generation check found, Content Credentials, faces, readable text and
the key findings. **This package draws that result for you**, the same way the snapWONDERS report
page does, so you can show it to your users without writing any presentation code.

* One dependency-free web component, `<snapwonders-report>`. No framework, no build step.
* Two modes: a compact **card**, and a **full** report with every public check and the analysis
  images.
* Works anywhere a browser does: your web app, a browser extension, a WordPress page.
* It reads only the public result the API already returns, writes every value as text (never as
  HTML), and makes **no network calls of its own**.
* MIT, so restyle it, extend it or white-label it however your product needs.

All the snapWONDERS API services are available over the Clearnet / **Web** and Dark Web **Tor** and
**I2P**. Read details: https://snapwonders.com/developers


# See it in action

<p align="center"><img src="https://snapwonders.com/images/report-examples/ai-generated/card.png" width="544" alt="A snapWONDERS result card for an AI-generated café photo: Authenticity C, moderate risk; Exposure B, low risk; processed by an AI image generator, 3 faces, 14 text areas" /></p>

We asked an AI image generator for a café photo with two people and readable signs, then checked it
with the snapWONDERS API. The card above is this package drawing the unchanged JSON from
`GET /api/analyse/result/{job_uid}`.

The same result in **full** mode, with the reasons and the evidence maps:
[open the full report](https://snapwonders.com/images/report-examples/ai-generated/full.png).

More examples, all hosted on snapwonders.com:

* [Example reports](https://snapwonders.com/products/examples): an AI-generated photo, an edited
  photo and a camera original, with what each report tells you.
* [Developer examples](https://snapwonders.com/developers/examples): the JSON behind each report and
  how to draw it.


# Installation and setup

## snapWONDERS API key
You will need a snapWONDERS API key to fetch results:

* Sign up and create an account at [snapWONDERS sign-up](https://snapwonders.com/signup). If you
  wish to create an account via Tor or I2P then you can do so by accessing snapWONDERS through the
  Tor or I2P portals. For the dark web links visit
  [browsing safely](https://snapwonders.com/browsing-safely).
* Under your account settings, generate an API key. New keys start with `sw_`. It is sent as the
  `X-Api-Key` header on every request — keep it secret, and **never put it in browser code**. Fetch
  the result on your server and pass the JSON to the page.

## Install the package

```bash
npm install @snapwonders/report
```

Or copy the `src/` folder into your project — it has no dependencies. Browser extensions and
WordPress plugins must bundle it this way: their stores do not allow loading code from another
server.


# Quickstart

```html
<snapwonders-report id="card" report-url="https://snapwonders.com/upload/analyse/result/…" check-another></snapwonders-report>

<script type="module">
    import '@snapwonders/report';

    //  `result` is the JSON your server got from GET /api/analyse/result/{job_uid}
    document.getElementById('card').result = result;
</script>
```

On a static page you can put the result inline instead:

```html
<snapwonders-report>
    <script type="application/json">{ "schema_version": "1.0", "files": [ … ] }</script>
</snapwonders-report>
```

| Attribute | What it does |
|---|---|
| `mode` | `card` (default) or `full` |
| `report-url` | Adds an **Open full report** button linking to that address |
| `check-another` | Adds a **Check another** button; listen for the `snapwonders-check-another` event |
| `file-index` | Which file of a multi-file result to draw (default `0`) |
| `link-params` | Tracking parameters added to the snapWONDERS links, e.g. `src=myapp` (keys `src`, `site`, `r`) |

**Full report with your analysis images.** The API returns each analysis image as an asset with a
`download_path` that needs your API key, so download them on your server and tell the renderer where
you keep them:

```js
const report = document.querySelector('snapwonders-report[mode="full"]');
report.assetUrl = (asset) => `/media/snapwonders/${asset.asset_id}.jpg`;   // your copy of each image
report.result   = result;
```

**Attribution.** The "Checked by snapWONDERS" credit and the snapWONDERS Vaultify link are part of
the API result (`attribution`, `vaultify_cta`). The renderer draws them only when they point at
snapwonders.com and never adds a credit of its own.

**One file.** `npm run build` writes `dist/snapwonders-report.js`, the whole renderer as a single
classic script. Browser extensions and WordPress plugins bundle that file: their stores do not allow
loading code from another server.

**Theming.** Set any of `--sw-font`, `--sw-bg`, `--sw-text`, `--sw-muted`, `--sw-border`,
`--sw-accent` and `--sw-radius` on the element.

**Without the element.** `import { buildCardModel } from '@snapwonders/report/model'` gives you the
same wording as plain data, for a native app or server-side rendering.


# Keeping up with the API

Every result carries `schema_version` (`major.minor`); this version knows up to **1.4**
(`SUPPORTED_SCHEMA`). When a result is newer, by any bump, minor too, the card still draws everything it
understands, adds a small note *"A new version is available, with more in this report. See what's new"*,
and fires `snapwonders-update-available` so your app can prompt an update. The note is gentle for a
minor bump and firmer for a major one (*"Update needed: …"*). It has a × button: the element then fires
`snapwonders-update-dismissed` with the result's `schemaVersion`; keep that (an extension keeps it in its
storage) and pass it back as `dismissed-update`, and the note stays hidden for that version and returns on
the next. The result's `schema_version` is separate from your product's version: a big extension
release does not change it. Set `release-notes-url` to
your own release notes (an extension or plugin version page); without it the note links to this
package's changelog. A field that is missing, `null` or of the wrong type is simply not drawn: the
renderer never fails on a result, and a test feeds it thousands of damaged results to keep it that way.


# Running the tests

```bash
npm test
```

The tests run offline on Node 18 or later and need no API key.


# Documentation

Useful documentation can be found at:

* The interactive Swagger UI and full endpoint reference:
  [snapWONDERS API](https://snapwonders.com/api)
* A guided, step-by-step integration walkthrough:
  [snapWONDERS Developers](https://snapwonders.com/developers)


# Contact

## For security concerns
If you have spotted any security concerns then please reach out via
[contacting snapWONDERS](https://snapwonders.com/contact) and set the subject to
**"SECURITY CONCERNS"** and provide the information about your concerns. If you wish to contact via
Tor or I2P then you can do so by accessing snapWONDERS through the Tor or I2P portals. For the dark
web links visit [browsing safely](https://snapwonders.com/browsing-safely).

## For FAQ and questions
It may be that your question is already answered in the [FAQ](https://snapwonders.com/faq). Be sure
to check the FAQ content first. Otherwise you may reach out via
[contacting snapWONDERS](https://snapwonders.com/contact).

## For contacting the author
Use this link to contact the author [Kenneth Springer](https://kennethbspringer.au/).


# Why snapWONDERS exists

This project started with my son, Huey.

Huey lost his eyesight and was legally blind from the age of four. Years ago, in the car, while we were working on Hueyify together, he insisted the idea could be applied to digital media: stories embedded inside a photo, so that people with vision impairments could get the personal context, the memory and the feeling behind it. Hidden from everyone else. Only for the person it was meant for.

He was excited at the thought of it. I'll admit the technical difficulty put me off, and I was vocal about it. The look of disappointment kept returning to me, because to Huey it all made sense. We lost Huey at sixteen. I could never let go of that conversation.

snapWONDERS came first, to understand what digital media actually contains and who can see it. Vaultify came after, and it is the closest thing I've built to what Huey described. As of September 2026, snapWONDERS and Vaultify have processed more than six million media jobs.

The full story is at https://vaultify.snapwonders.com/our-story

May peace be with you,<br>
Kenneth Springer


# Licence

MIT — Copyright (c) 2026 Kenneth Springer @ snapWONDERS. See [LICENSE](LICENSE).

**Scope.** The MIT licence covers **this library only**. It grants no rights in the snapWONDERS API,
service, data, models, or algorithms whose results it displays — these are **proprietary** and remain
the property of Kenneth Springer @ snapWONDERS. Use of the API requires an API key and is governed by
the [snapWONDERS Terms of Service](https://snapwonders.com/terms-of-service).

The MIT licence also does not cover the snapwonders.com website or anything it hosts (including the
example photos, results and report images), or the snapWONDERS and Vaultify names and logos —
© Kenneth Springer @ snapWONDERS, all rights reserved.
