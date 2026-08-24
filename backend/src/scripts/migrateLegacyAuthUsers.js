import 'dotenv/config';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const applyChanges = process.argv.includes('--apply');
const sendResetEmails = process.argv.includes('--send-reset');
const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
  throw new Error(
    'SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.'
  );
}

const authOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
};
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, authOptions);
const supabasePublic = createClient(supabaseUrl, publishableKey, authOptions);

async function listAllAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000
    });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function migrateUser(profile, existingAuthUser) {
  if (existingAuthUser) {
    await prisma.user.update({
      where: { id: profile.id },
      data: {
        authUserId: existingAuthUser.id,
        passwordHash: null
      }
    });
    return existingAuthUser;
  }

  const temporaryPassword = `${crypto.randomBytes(32).toString('base64url')}Aa1!`;
  const {
    data: { user },
    error
  } = await supabaseAdmin.auth.admin.createUser({
    email: profile.email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: {
      legacy_profile_id: profile.id
    },
    user_metadata: {
      full_name: profile.fullName
    }
  });
  if (error || !user) {
    throw error || new Error(`Could not create Supabase Auth user for ${profile.email}.`);
  }

  return user;
}

async function main() {
  const profiles = await prisma.user.findMany({
    where: { authUserId: null },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Legacy profiles awaiting Supabase Auth: ${profiles.length}`);
  if (!applyChanges || profiles.length === 0) {
    console.log(
      applyChanges
        ? 'Nothing to migrate.'
        : 'Dry run only. Re-run with --apply after backup and schema verification.'
    );
    return;
  }

  const authUsers = await listAllAuthUsers();
  const authByEmail = new Map(
    authUsers
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user])
  );
  let migrated = 0;
  let resetEmailsQueued = 0;

  for (const profile of profiles) {
    const authUser = await migrateUser(
      profile,
      authByEmail.get(profile.email.toLowerCase())
    );
    migrated += 1;

    if (sendResetEmails) {
      const { error } = await supabasePublic.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${clientUrl}/reset-password`
      });
      if (error) {
        console.warn(`Reset email failed for ${profile.email}: ${error.message}`);
      } else {
        resetEmailsQueued += 1;
      }
    }

    console.log(`Linked ${profile.email} -> ${authUser.id}`);
  }

  console.log(`Migrated profiles: ${migrated}`);
  console.log(`Password reset emails queued: ${resetEmailsQueued}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
