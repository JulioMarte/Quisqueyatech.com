import { getMigrations } from "better-auth/db/migration";
import { authRuntimeFromEnv } from "../src/server/auth";
import { SQLiteDatabase, databasePath } from "../src/server/db/sqlite";

// Application-owned migrations always run before Better Auth inspects the same file.
const applicationDatabase = new SQLiteDatabase({ path: databasePath() });
applicationDatabase.close();

const runtime = authRuntimeFromEnv();
try {
  const migrations = await getMigrations(runtime.auth.options);
  await migrations.runMigrations();
  console.log(`Better Auth schema ready at ${databasePath()}`);
} finally {
  runtime.close();
}
