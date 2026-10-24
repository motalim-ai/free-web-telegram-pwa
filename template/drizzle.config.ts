import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` turns schema.ts into SQL migrations in ./drizzle; wrangler applies them to D1.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/worker/db/schema.ts',
  out: './drizzle',
});
