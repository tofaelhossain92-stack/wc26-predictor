#!/bin/bash
cd ~/Downloads/wc26-predictor
git pull
npx vercel --prod --force
echo ""
echo "✅ Deploy complete! Press any key to close."
read -n 1
