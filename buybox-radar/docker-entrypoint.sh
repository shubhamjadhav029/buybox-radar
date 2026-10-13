#!/bin/sh
set -e
npx prisma migrate deploy --schema ./prisma/schema.prisma
if [ "$SEED_ON_BOOT" = "true" ]; then node dist/seed.js --if-empty; fi
exec node dist/index.js
