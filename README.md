# KAUST Academy · Professional Programs Platform

An interactive front-end prototype of the KAUST Academy Professional Programs platform (final demo, v5).

- **Ownership model:** Academy Admin owns the structure; Trainer owns the learning content.
- **Single self-contained file:** `index.html` holds all the HTML, CSS and vanilla JS. It needs no build step, no libraries and no network.
- **Sample data only:** every person and record in it is fictional. The integrations (SSO, OTP, geofencing, QR signing, Zoom/Teams, SharePoint, email/SMS/WhatsApp, certificate verification) are simulated in the front end.
- **Languages:** Arabic (RTL) and English.

## Run locally
Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Editing
All the code is in `index.html`:
- **Design tokens** (colors, fonts, radius) are in `:root` at the top of the `<style>` block.
- **The app logic and sample data** are in the `<script>` block at the bottom.

## Deployment
`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push to `main`. Turn it on under **Settings → Pages → Source: GitHub Actions**.
