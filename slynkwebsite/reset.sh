#!/bin/bash
# Reset script for Next.js application

echo "Stopping any running Next.js processes..."
pkill -f next || true

echo "Removing build artifacts and caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.prisma

echo "Regenerating Prisma client..."
npx prisma generate

echo "Rebuilding the application..."
npm run build

echo "Starting development server..."
npm run dev 