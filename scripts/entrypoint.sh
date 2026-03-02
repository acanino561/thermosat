#!/bin/sh
set -e

# Run migrations
./scripts/migrate.sh

# Start the app
exec node server.js
