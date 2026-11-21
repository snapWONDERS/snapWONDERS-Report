# Changelog

## 0.2.1 — 2026-11-21

- README: the banner at the top showed as a broken image (old logo address). It now shows the
  snapWONDERS Report banner, like the SDK READMEs. No code changes.

## 0.2.0 — 2026-11-21

- **Newer results (owner 2026-11-20):** any newer `schema_version`, minor too, shows a non-blocking
  "new version available" note with a "See what's new" link (`release-notes-url`, else this changelog);
  everything the renderer understands is still drawn. `SUPPORTED_SCHEMA` = 1.4. Gentle wording for a
  minor bump, firmer for a major one. Dismissable: `snapwonders-update-dismissed` + `dismissed-update`
  keep it hidden for that version until the next.
- Never fails on a damaged result: a permanent fuzz test deletes each field, or makes it `null`, a string
  or a number, and draws both the model and the card.

- **Full mode** (`mode="full"`): every finding, hidden-content, encoder-fingerprint, compression and
  noise differences, audio and video checks, and the analysis images supplied by the host through
  `assetUrl`.
- Attribution and the snapWONDERS Vaultify link are drawn **only from the result** (schema 1.1
  `attribution`, `vaultify_cta`), on snapwonders.com hosts only; `link-params` adds tracking
  parameters to them.
- Pixel-analysis wording; "Declared AI-generated or AI-edited".
- Single-file build (`npm run build` → `dist/snapwonders-report.js`), tested to contain no network
  calls.

## 0.1.0 — not published

First version: `<snapwonders-report>` draws one analyse result as a card.

- The two headline grades, Authenticity and Exposure, with how sure we are. Never combined.
- AI generation, Content Credentials, faces and readable text.
- Up to five key findings, most serious first.
- **Open full report** and **Check another** buttons, the snapWONDERS attribution and the
  snapWONDERS Vaultify link.
- Reads result contract `schema_version` 1.x; a newer major version shows an update notice and
  fires `snapwonders-update-available`.
