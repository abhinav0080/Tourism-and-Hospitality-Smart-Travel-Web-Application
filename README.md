# Smart Travel — Full-stack travel planning demo

React 19 + Express 5 + SQLite web application demonstrating account registration, sign-in, destination discovery and **demo** travel bookings.

> **Portfolio/demo scope:** No airline, hotel, payment provider, AI model or live inventory is connected. Booking records are stored only in this application's SQLite database; they do not constitute real reservations.

## Features
- React frontend with responsive pages for sign-in, registration, destinations and bookings
- Express REST API with request validation and consistent JSON errors
- Per-user bookings protected by signed, expiring bearer tokens
- Passwords hashed using Node.js scrypt with individual random salts
- SQLite persistence for accounts and example bookings
- Health endpoint and deterministic sample listings

## Quick start

Requires Node.js 20+.

```bash
npm ci
cp .env.example .env
# Set a long random SESSION_SECRET in .env, e.g. with node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm run dev
```

Frontend: http://localhost:3000 | API: http://localhost:5001

If your React dev server runs at another address, update CLIENT_ORIGIN. Do not commit .env or database.sqlite.

## Environment
See [`.env.example`](.env.example). The API does not require a Gemini key.

## API
| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/health | API health |
| POST | /api/register | Create account |
| POST | /api/login | Sign in |
| GET | /api/me | Current user (bearer token) |
| GET | /api/hotels/list | Sample hotel catalog |
| GET | /api/flights/destinations | Sample destinations |
| GET | /api/bookings | My bookings (bearer token) |
| POST | /api/bookings | Save demo booking (bearer token) |
| DELETE | /api/bookings/:id | Delete my booking (bearer token) |

## Architecture

```text
src/               React UI and API client
public/            HTML entry point
server.js          Express API, validation, auth and SQLite persistence
database.sqlite    Local runtime DB (not version-controlled)
.env.example       Environment variable names, no secrets
```

## Security and limitations
- The old repository history included a public Gemini API key. **Revoke/rotate that key immediately**; deleting a tracked file does not erase git history.
- Legacy demo accounts using plaintext passwords are not migrated; create a fresh account after this change.
- No email verification, password reset, rate limiting, production session revocation or abuse protection. Do not deploy this demo publicly without these protections and an operational security review.
- Tokens are stored in browser sessionStorage for this demo; production authentication should prefer hardened HttpOnly secure cookies and CSRF protection.
- Example travel listings are fictional and prices are illustrative.
- The frontend and API need CI checks and end-to-end browser testing before production.
- If a previous SQLite DB contained real data, back it up securely before migration.

## Next milestones
1. Add integration tests using temporary databases, with isolated test secrets.
2. Add paginated search/filtering, booking detail and cancellation flows.
3. Add deployment, CI and screenshots of verified screens.
4. Integrate a real provider only with an approved backend contract and protected credentials.

## Resume description
**Full-stack Travel Planning Demo** — Built a React/Express/SQLite application with authenticated per-user demo bookings, input validation and responsive travel discovery screens. Implemented salted password hashing and scoped REST endpoints. This project **does not process real bookings**.
