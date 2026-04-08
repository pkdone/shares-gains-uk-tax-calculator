# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Shares Gains UK Tax Calculator — a Next.js 15 (App Router) + React 19 web app with MongoDB as the sole database. Uses `better-auth` for authentication. See `README.md` for full project layout and standard commands.

### Local MongoDB (required for Cloud Agent VMs)

The app requires MongoDB with **replica set** support because `better-auth` uses transactions. MongoDB Atlas is the production target but is typically unreachable from Cloud Agent VMs (IP allowlisting). Use a local MongoDB instance instead:

```bash
# Install MongoDB 8.0 (Ubuntu Noble)
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update -qq && sudo apt-get install -y -qq mongodb-org-server mongodb-mongosh

# Start as single-node replica set
sudo mkdir -p /data/db && sudo chown $(whoami) /data/db
mongod --dbpath /data/db --bind_ip 127.0.0.1 --port 27017 --replSet rs0 &
sleep 3
mongosh --quiet --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: '127.0.0.1:27017'}]})"
```

### Environment variables

Create `.env.local` from `.env.example`. For local MongoDB:

```
MONGODB_URI="mongodb://127.0.0.1:27017/shares-gains-dev?replicaSet=rs0"
```

**Important:** The `MONGODB_URI` secret injected by Cursor Secrets points at Atlas and is unreachable. Override it explicitly when running scripts and the dev server, or ensure `.env.local` is loaded first (dotenv does not override existing env vars).

### Running scripts and the dev server

Because the shell may have `MONGODB_URI` set from Cursor Secrets (pointing at unreachable Atlas), always prefix database-touching commands with the local URI:

```bash
MONGODB_URI="mongodb://127.0.0.1:27017/shares-gains-dev?replicaSet=rs0" npm run db:init
MONGODB_URI="mongodb://127.0.0.1:27017/shares-gains-dev?replicaSet=rs0" npm run fetch:fx-rates
MONGODB_URI="mongodb://127.0.0.1:27017/shares-gains-dev?replicaSet=rs0" npm run dev
```

### Build caveat

`next build` fails if `NODE_ENV=development` is set in the shell. Either `unset NODE_ENV` before building or run the build without that env var.

### Standard commands (see README.md / package.json)

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| Integration tests | `npm run test:integration` |
| Full validate | `npm run validate` (build + lint + test + test:integration) |
| DB init | `npm run db:init` |
| Seed FX rates | `npm run fetch:fx-rates` |

### Email verification in development

`AUTH_EMAIL_PROVIDER=noop` logs verification/reset URLs to the dev server terminal. Look for `[dev] NOOP EMAIL` lines. Copy the URL and open it in the browser to verify.

### Health check

`GET /api/health` returns `{"status":"ok","db":"connected"}` when the database is reachable and provisioned.
