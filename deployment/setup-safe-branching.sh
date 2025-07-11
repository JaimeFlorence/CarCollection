#!/bin/bash

echo "=== Setting Up Safe Git Branching ==="
echo ""

cd /home/jaime/MyCode/src/CarCollection

echo "1. Current Git Status:"
git status --short
echo ""

echo "2. Creating backup tag of current state..."
git tag -f backup-before-empty-db-fixes
echo "✓ Created backup tag: backup-before-empty-db-fixes"
echo ""

echo "3. Current branch:"
git branch --show-current
echo ""

echo "4. Creating new branch for empty database fixes..."
git checkout -b fix-empty-database-issues
echo ""

echo "5. New branch status:"
git branch --show-current
echo ""

echo "=== Branch Setup Complete ==="
echo ""
echo "You are now on the 'fix-empty-database-issues' branch."
echo "All changes will be isolated here."
echo ""
echo "To switch back to main branch (if needed):"
echo "  git checkout main"
echo ""
echo "To see all branches:"
echo "  git branch -a"
echo ""
echo "To abandon all changes and go back to the backup:"
echo "  git checkout main"
echo "  git reset --hard backup-before-empty-db-fixes"
echo ""