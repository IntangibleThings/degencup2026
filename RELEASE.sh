#!/bin/bash
# Degen Cup 2026 Release Workflow
# Usage: ./RELEASE.sh <version> <commit-message>
# Example: ./RELEASE.sh v51 "fixed draft lock visual feedback"

set -e

VERSION=$1
MESSAGE=$2

if [ -z "$VERSION" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: ./RELEASE.sh <version> <commit-message>"
  echo "Example: ./RELEASE.sh v51 'fixed draft lock visual feedback'"
  exit 1
fi

echo "=== Degen Cup 2026 Release: $VERSION ==="
echo ""

# Step 1: Extract latest backup as base (run this first when starting fresh)
# tar -xzf ~/Downloads/degencup2026-latest.tar.gz --strip-components=1

# Step 2: Make your code changes
# ... edit files ...

# Step 3: Build
echo "[1/4] Building..."
cd app
npm run build

# Step 4: Deploy
echo "[2/4] Deploying..."
# Deploy via the web UI or: npx surge dist/ degencup2026.surge.sh

# Step 5: Git commit
echo "[3/4] Committing to Git..."
git add .
git commit -m "$VERSION - $MESSAGE"

# Step 6: Create tarball backup
echo "[4/4] Creating tarball backup..."
cd ..
tar -czf "degencup2026-$VERSION.tar.gz" --exclude='app/node_modules' app/

echo ""
echo "=== Release $VERSION Complete ==="
echo "Backup: degencup2026-$VERSION.tar.gz"
echo "Commit: $(cd app && git log -1 --oneline)"
