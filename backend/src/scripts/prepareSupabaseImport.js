import fs from 'node:fs/promises';
import path from 'node:path';

const backupArgument = process.argv.find((argument) =>
  argument.startsWith('--backup=')
);
if (!backupArgument) {
  throw new Error('Pass the Neon backup path with --backup=<path>.');
}

const backupPath = path.resolve(backupArgument.slice('--backup='.length));
const backup = JSON.parse(await fs.readFile(backupPath, 'utf8'));
if (!backup.columns) {
  throw new Error('The backup does not contain column metadata. Create a new backup.');
}

const importOrder = [
  'users',
  'achievements',
  'courses',
  'exams',
  'passages',
  'question_bank_items',
  'teacher_profiles',
  'sections',
  'questions',
  'options',
  'attempts',
  'user_answers',
  'ai_feedback',
  'skill_stats',
  'user_achievements',
  'follows',
  'notifications',
  'course_classes',
  'course_enrollments',
  'course_assignments',
  'course_materials',
  'course_announcements',
  'live_sessions',
  'assignment_submissions'
];

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function unwrapTaggedValue(value) {
  if (!value || typeof value !== 'object' || !value.$type) return null;
  return value;
}

function sqlValue(value, column) {
  if (value === null || value === undefined) return 'NULL';

  const tagged = unwrapTaggedValue(value);
  if (tagged?.$type === 'bigint' || tagged?.$type === 'decimal') {
    return tagged.value;
  }
  if (tagged?.$type === 'date') {
    return quoteString(tagged.value);
  }
  if (tagged?.$type === 'bytes') {
    return `decode(${quoteString(tagged.value)}, 'base64')`;
  }

  if (column.data_type === 'json' || column.data_type === 'jsonb') {
    return `${quoteString(JSON.stringify(value))}::${column.data_type}`;
  }

  if (column.data_type === 'ARRAY') {
    const arrayType = column.udt_name.startsWith('_')
      ? column.udt_name.slice(1)
      : 'text';
    return `ARRAY[${value
      .map((item) => sqlValue(item, { data_type: 'text', udt_name: 'text' }))
      .join(', ')}]::${arrayType}[]`;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'string') {
    return quoteString(value);
  }

  return `${quoteString(JSON.stringify(value))}::jsonb`;
}

const avatarDirectory = path.join(path.dirname(backupPath), 'avatars');
await fs.mkdir(avatarDirectory, { recursive: true });

const statements = [
  '-- Generated from a verified Neon JSON backup.',
  '-- Password hashes are intentionally not imported into public.users.',
  'BEGIN;',
  "SET LOCAL statement_timeout = '120s';"
];

for (const tableName of importOrder) {
  const rows = backup.tables[tableName] || [];
  if (!rows.length) continue;

  const columnsByName = new Map(
    backup.columns[tableName].map((column) => [column.column_name, column])
  );

  for (const originalRow of rows) {
    const row = { ...originalRow };

    if (tableName === 'users') {
      row.password_hash = null;
      if (typeof row.avatar_url === 'string' && row.avatar_url.startsWith('data:')) {
        const match = row.avatar_url.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
        if (!match) {
          throw new Error(`Unsupported avatar data URL for user ${row.id}.`);
        }
        const extension =
          match[1] === 'image/jpeg'
            ? 'jpg'
            : match[1].split('/')[1].replace('svg+xml', 'svg');
        await fs.writeFile(
          path.join(avatarDirectory, `${row.id}.${extension}`),
          Buffer.from(match[2], 'base64')
        );
        row.avatar_url = null;
      }
    }

    const columns = Object.keys(row).filter((columnName) =>
      columnsByName.has(columnName)
    );
    const columnSql = columns.map(quoteIdentifier).join(', ');
    const valueSql = columns
      .map((columnName) => sqlValue(row[columnName], columnsByName.get(columnName)))
      .join(', ');
    statements.push(
      `INSERT INTO public.${quoteIdentifier(tableName)} (${columnSql}) VALUES (${valueSql}) ON CONFLICT DO NOTHING;`
    );
  }
}

statements.push('COMMIT;');

const outputPath = backupPath.replace(/\.json$/i, '-supabase-import.sql');
await fs.writeFile(outputPath, `${statements.join('\n')}\n`, { flag: 'wx' });
console.log(`Supabase import SQL created: ${outputPath}`);
console.log(`Extracted avatars: ${(await fs.readdir(avatarDirectory)).length}`);
