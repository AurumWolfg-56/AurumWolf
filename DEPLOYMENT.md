# Deployment Guide (Hostinger/VPS)

## Prerequisites
*   Node.js v18+ installed on server.
*   Git access to the repository.
*   `.env.local` configured on the server.

## 1. Automated Release (Local)
Before deploying, create a release tag locally:
```bash
npm run release       # Creates a patch release (0.0.1 -> 0.0.2)
# OR
npm run release:minor # Creates a minor release (0.1.0 -> 0.2.0)

git push && git push --tags
```

## 2. Server Deployment
SSH into your Hostinger VPS and run:

```bash
# 1. Navigate to project
cd ~/domains/aurumwolf

# 2. Pull latest changes
git fetch --tags
git checkout $(git describe --tags `git rev-list --tags --max-count=1`)

# 2.1 OR just pull main if not strict about tags
git pull origin main

# 3. Install Dependencies (Full Install for Build)
npm install
# Do NOT use --omit=dev yet, as we need Vite/Tailwind to build the app.

# 4. Build the Frontend
npm run build

# 5. (Optional) Prune Dev Dependencies
# npm prune --production

# 5. Restart the Server
# If using basic node:
# pkill -f "node server.js"
# nohup npm start > app.log 2>&1 &

# Recommended: Use PM2
pm2 restart aurumwolf || pm2 start server.js --name aurumwolf
```

## 3. Verification
Check the health endpoint:
```bash
curl http://localhost:3000/health
```
