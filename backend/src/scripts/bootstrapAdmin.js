import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const applyChanges = process.argv.includes('--apply');
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const fullName = process.env.BOOTSTRAP_ADMIN_FULL_NAME?.trim() || 'MonoPrep Admin';
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password || password.length < 12) {
  throw new Error(
    'BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters are required.'
  );
}
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function findAuthUserByEmail() {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000
    });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match || data.users.length < 1000) return match || null;
  }
}

async function main() {
  const existingProfile = await prisma.user.findUnique({
    where: { email },
    select: { id: true, authUserId: true, role: true, status: true }
  });
  const existingAuthUser = await findAuthUserByEmail();

  console.log({
    email,
    existingProfile: Boolean(existingProfile),
    existingAuthUser: Boolean(existingAuthUser),
    requestedRole: 'ADMIN'
  });
  if (!applyChanges) {
    console.log('Dry run only. Re-run with --apply to create or promote this admin.');
    return;
  }

  let authUser = existingAuthUser;
  if (!authUser) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: existingProfile
        ? { legacy_profile_id: existingProfile.id }
        : undefined,
      user_metadata: { full_name: fullName }
    });
    if (error || !data.user) {
      throw error || new Error('Supabase admin user could not be created.');
    }
    authUser = data.user;
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      authUserId: authUser.id,
      fullName,
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: null
    },
    create: {
      id: authUser.id,
      authUserId: authUser.id,
      fullName,
      email,
      role: 'ADMIN',
      status: 'ACTIVE'
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true
    }
  });

  console.log('MonoPrep admin ready:', admin);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
