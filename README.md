# KAUST Academy · Professional Programs Platform

An interactive front-end prototype of the KAUST Academy Professional Programs platform (final demo, v5).

- **Ownership model:** Academy Admin owns the structure; Trainer owns the learning content.
- **Plain static site:** HTML, CSS and vanilla JS. It needs no build step, no libraries and no network.
- **Sample data only:** every person and record in it is fictional. The integrations (SSO, OTP, geofencing, QR signing, Zoom/Teams, SharePoint, email/SMS/WhatsApp, certificate verification) are simulated in the front end.
- **Languages:** Arabic (RTL) and English.

## Run locally
Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Project structure
```
index.html        page shell: loads the stylesheet and the scripts in order
css/styles.css    all styles (design tokens such as colors and fonts are in :root at the top)
js/i18n.js        Arabic / English interface text (STR)
js/core.js        utilities, saving to the browser, permissions, derived data
js/data.js        fictional seed data (programs, clients, courses, people)
js/ui.js          UI kit: icons, reusable components, modal, toast, local file store
js/qr.js          QR code generator
js/xlsx.js        minimal .xlsx reader (for imports)
js/shell.js       role-aware navigation, layout, router, notifications, demo guide
js/admin.js       Academy Admin: home, programs, clients, setup, schedule
js/people.js      People & access (Academy Admin)
js/course.js      course page (role-based tabs)
js/sessions.js    sessions & attendance
js/roles.js       role homes (Program Coordinator, Instructor, Client Coordinator, Participant)
js/main.js        shared actions, event wiring, timers, startup
```
The scripts are plain (non-module) scripts that share global variables, so their order in `index.html` matters. Add a new file before `js/main.js`.

## Deployment
`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push to `main`. Turn it on under **Settings → Pages → Source: GitHub Actions**.
