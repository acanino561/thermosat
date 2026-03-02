#!/bin/sh
echo "Running database migrations..."
npx drizzle-kit push
echo "Migrations complete."
