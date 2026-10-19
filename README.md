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
js/xlsx.js        minimal .xlsx reader and writer (imports, template download)
js/shell.js       role-aware navigation, layout, router, notifications, demo guide
js/admin.js       Academy Admin: home, programs, clients, setup, schedule
js/people.js      People directory & access (Academy Admin): search/filter, roles, assignments, duplicate-safe invites
js/profile.js     user profiles: one account per person, role-specific sections, view/edit, multi-role acting
js/course.js      course page (role-based tabs)
js/assess-import.js  instructor import of assessments from the Excel template (template, validation, review)
js/surveys.js     instructor-built course surveys (rating, multiple choice, free text), responses, results
js/sessions.js    sessions & attendance (code / QR check-in, manual exceptions)
js/geo.js         location-based check-in for in-person sessions (one-shot, nothing stored but the result)
js/roles.js       role homes (Program Coordinator, Instructor, Teaching Assistant, Client Coordinator, Participant)
js/main.js        shared actions, event wiring, timers, startup
```
The scripts are plain (non-module) scripts that share global variables, so their order in `index.html` matters. Add a new file before `js/main.js`.

## Deployment
`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push to `main`. Turn it on under **Settings → Pages → Source: GitHub Actions**.

## Roles (demo role switcher)
| Role | Sees | Can change |
| --- | --- | --- |
| Academy Admin / Program Manager | Programs, People, Reports | Program structure: clients, courses, sessions and venues, team assignment, enrolment |
| Instructor | My courses (assigned only) | Materials, assessments (incl. Excel import), surveys, activities; runs own sessions |
| Teaching Assistant | Assigned courses | Attendance exceptions with a reason; read-only rosters |
| Program Coordinator | Operations for assigned programs | Delivery support: invites, attendance exceptions |
| Client Coordinator | Program overview (own organisation) | Read-only; sees shared published materials and summary progress |
| Participant | My Learning | Own check-in, assessments, surveys, submissions |

## Location check-in (demo)
In-person sessions can be pinned to a venue (coordinates or a map link) with a check-in radius (default 100 m),
a maximum location accuracy (default ±50 m) and a window that opens before the start (default 30 min) and closes
when the session ends. A participant's device location is requested once, only when they tap
**Check in with my location**, and only over https. It is compared with the venue using the haversine distance;
readings that are too imprecise, or too close to the boundary to decide, ask the participant to retry. Only the
result, time, method and a rounded distance/accuracy are stored — never coordinates. Demo controls simulate
readings on devices without GPS and are recorded as simulated. Authorised staff can record a manual exception
with a reason, which is written to the activity log. This is a demo, not a legally or operationally approved system.

## Profiles and accounts
Every person has one account (work email is unique). Staff accounts can hold several roles (for example Instructor and
Teaching Assistant); the person chooses which role they are **acting as**, and only that role's permissions apply.
Participants have one account linked to all their course enrollments by work email. Client organisations are separate
records, not part of anyone's profile. Profiles never contain passwords.

| Role | Can edit on own profile |
| --- | --- |
| Academy Admin, Program Coordinator, Teaching Assistant, Client Coordinator | photo, name, job title, work phone, preferred language |
| Instructor | the above + biography, areas of expertise, qualifications, teaching languages |
| Participant | photo, work phone, preferred language |

Roles, account status and assignments are changed only by the Academy Admin (People → Access & assignments), and every
save handler re-checks these rules.
