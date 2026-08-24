import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultBackupDirectory = path.resolve(
  scriptDirectory,
  '../../../../migration-backups'
);
const timestamp = new Date().toISOString().replaceAll(':', '-');
const outputArgument = process.argv.find((argument) =>
  argument.startsWith('--output=')
);
const outputPath = outputArgument
  ? path.resolve(outputArgument.slice('--output='.length))
  : path.join(defaultBackupDirectory, `neon-data-${timestamp}.json`);

function serializeValue(value) {
  if (typeof value === 'bigint') {
    return { $type: 'bigint', value: value.toString() };
  }
  if (value instanceof Date) {
    return { $type: 'date', value: value.toISOString() };
  }
  if (Buffer.isBuffer(value)) {
    return { $type: 'bytes', value: value.toString('base64') };
  }
  if (
    value &&
    typeof value === 'object' &&
    value.constructor?.name === 'Decimal'
  ) {
    return { $type: 'decimal', value: value.toString() };
  }
  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        serializeValue(nestedValue)
      ])
    );
  }
  return value;
}

async function main() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `);

  const backup = {
    source: 'Neon',
    createdAt: new Date().toISOString(),
    columns: {},
    tables: {}
  };

  for (const { table_name: tableName } of tables) {
    const escapedTableName = tableName.replaceAll('"', '""');
    backup.columns[tableName] = await prisma.$queryRawUnsafe(
      `
        SELECT column_name, data_type, udt_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `,
      tableName
    );
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM public."${escapedTableName}"`
    );
    backup.tables[tableName] = rows.map(serializeValue);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(backup, null, 2), {
    flag: 'wx'
  });

  const rowCount = Object.values(backup.tables).reduce(
    (total, rows) => total + rows.length,
    0
  );
  console.log(`Neon backup created: ${outputPath}`);
  console.log(`Tables: ${Object.keys(backup.tables).length}; rows: ${rowCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
