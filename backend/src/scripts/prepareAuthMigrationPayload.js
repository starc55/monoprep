import crypto from 'node:crypto';
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
const outputDirectory = path.dirname(backupPath);
const payloadPath = path.join(outputDirectory, 'supabase-auth-migration-payload.json');
const credentialsPath = path.join(
  outputDirectory,
  'supabase-auth-temporary-credentials.json'
);

const payloadUsers = [];
const credentials = [];

for (const user of backup.tables.users || []) {
  const temporaryPassword = `${crypto.randomBytes(18).toString('base64url')}Aa1!`;
  let avatar = null;

  if (typeof user.avatar_url === 'string' && user.avatar_url.startsWith('data:')) {
    const match = user.avatar_url.match(
      /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i
    );
    if (!match) {
      throw new Error(`Unsupported avatar data URL for user ${user.id}.`);
    }
    avatar = {
      contentType: match[1],
      base64: match[2]
    };
  }

  payloadUsers.push({
    legacyProfileId: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    password: temporaryPassword,
    avatar
  });
  credentials.push({
    email: user.email,
    temporaryPassword,
    passwordResetRequired: true
  });
}

await fs.writeFile(
  payloadPath,
  JSON.stringify({ users: payloadUsers }, null, 2),
  { flag: 'wx' }
);
await fs.writeFile(credentialsPath, JSON.stringify(credentials, null, 2), {
  flag: 'wx'
});

console.log(`Auth migration payload created: ${payloadPath}`);
console.log(`Temporary credentials created: ${credentialsPath}`);
console.log(`Users prepared: ${payloadUsers.length}`);
