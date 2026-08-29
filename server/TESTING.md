# Running the backend tests

The `server/` app has an automated test suite covering the auth flow —
signup, login, the account-lockout logic, and session revocation on
password change. This doc is just the "how do I run this" reference;
see the comments in `server/tests/` for what each test actually checks
and why.

## Setup

```bash
cd server
npm install
```

This pulls in the three test-only packages (`jest`, `supertest`,
`mongodb-memory-server`) alongside the app's normal dependencies.

## Running the tests

```bash
npm test
```

This runs `jest` against everything in `server/tests/`.

### First run will be slow — this is expected

`mongodb-memory-server` downloads a real `mongod` binary (~780 MB) the
first time it runs on a machine, so the very first `npm test` can take a
while depending on your connection. Every run after that reuses the
cached binary and finishes in a few seconds.

If the first run fails with a hook timeout, it's almost always this
download not finishing in time — rerun it, or just wait it out. This
should be rare — the timeout is already set generously (120s in
`server/tests/auth.test.js`) specifically to cover this case — but a
very slow connection could still exceed it.

## What the tests actually run against

Each test file starts an in-memory MongoDB instance (via
`mongodb-memory-server`) before importing the app — **your real MongoDB
Atlas database is never touched by these tests.** The database is wiped
between individual tests (`afterEach` in `server/tests/setup.js`) so
each test starts from a clean, empty state.

Auth rate limiting is also disabled during tests (`NODE_ENV=test`) —
see the `skip` option in `server/middlewares/rateLimitMiddleware.js` —
since a full test run makes far more requests than a real user would in
15 minutes, and the point of these tests is checking the auth logic
itself, not re-testing the rate limiter. Production and local dev
behavior are unaffected by this.

## Adding new tests

Follow the same pattern as `server/tests/auth.test.js`:

- Import `setupTestDB` / `teardownTestDB` / `clearTestDB` from `./setup.js`
- Dynamically `import("../server.js")` **inside** `beforeAll`, after
  `setupTestDB()` has run — the app reads `MONGO_URI`, `JWT_SECRET`, and
  `CLIENT_ORIGIN` at import time, so those env vars have to be set
  before the import happens, not after
- Use `supertest`'s `request(app)` to call routes directly, no real
  server or browser needed
