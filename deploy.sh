#!/bin/bash
set -e

echo "=== FlashTests Deployment ==="

# 1. Build
echo ""
echo "📦 Building..."
npm run build

# 2. Deploy to Firebase Hosting
echo ""
echo "🚀 Deploying to Firebase..."
npx firebase-tools deploy --only hosting --project generador-de-test-c0035

# 3. Git commit + push
echo ""
echo "📤 Committing and pushing to GitHub..."
git add -A
echo ""
echo "Enter commit message:"
read commitMessage
if [ -z "$commitMessage" ]; then
    commitMessage="deploy: $(date +%Y-%m-%d-%H%M)"
fi
git commit -m "$commitMessage"
git push

echo ""
echo "✅ Deploy complete!"
echo "   https://flashtests.app"
