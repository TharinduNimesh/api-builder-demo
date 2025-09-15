#!/bin/sh
set -e

# Wait for DB to be ready (simple retry loop)
if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for database..."
  for i in 1 2 3 4 5 6 7 8 9 10; do
    # try node script that attempts a DB connection or use pg_isready if available
    if npx prisma db pull --print >/dev/null 2>&1; then
      echo "Database reachable"
      break
    fi
    echo "Database not ready yet, retrying... ($i)"
    sleep 2
  done
fi

# Run migrations (dev) if prisma migrate exists
if [ -f ./prisma/schema.prisma ]; then
  echo "Pushing Prisma schema (prisma db push)..."
  npx prisma db push || echo "prisma db push failed, continuing..."

  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy || echo "prisma migrate deploy failed or nothing to apply"
fi

# start the app
exec "$@"
