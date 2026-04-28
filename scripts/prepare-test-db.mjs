import "dotenv/config";
import * as mariadb from "mariadb";

function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const url = new URL(databaseUrl);
  const database = url.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error("DATABASE_URL must include a database name");
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}

const connectionConfig = parseDatabaseUrl(process.env.DATABASE_URL);

const connection = await mariadb.createConnection({
  host: connectionConfig.host,
  port: connectionConfig.port,
  user: connectionConfig.user,
  password: connectionConfig.password,
  allowPublicKeyRetrieval: true,
  ssl: false,
});

await connection.query(`CREATE DATABASE IF NOT EXISTS \`${connectionConfig.database}\``);
await connection.end();
