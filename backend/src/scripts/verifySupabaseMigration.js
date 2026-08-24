import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const strict = process.argv.includes('--strict');

async function scalar(query) {
  const rows = await prisma.$queryRawUnsafe(query);
  return Number(Object.values(rows[0] || {})[0] || 0);
}

async function main() {
  const checks = {
    publicTablesWithoutRls: await scalar(`
      select count(*)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and not c.relrowsecurity
    `),
    missingStorageBuckets: await scalar(`
      select 5 - count(*)
      from storage.buckets
      where id in (
        'avatars',
        'teacher-files',
        'exam-assets',
        'course-materials',
        'assignment-files'
      )
    `),
    missingAuthTrigger: await scalar(`
      select case when exists (
        select 1
        from pg_trigger
        where tgname = 'on_auth_user_created'
          and not tgisinternal
      ) then 0 else 1 end
    `),
    unlinkedProfiles: await scalar(`
      select count(*) from public.users where auth_user_id is null
    `),
    linkedProfilesWithLegacyHash: await scalar(`
      select count(*)
      from public.users
      where auth_user_id is not null
        and password_hash is not null
    `),
    authProfileMismatches: await scalar(`
      select count(*)
      from public.users app_user
      left join auth.users auth_user on auth_user.id = app_user.auth_user_id
      where app_user.auth_user_id is not null
        and auth_user.id is null
    `),
    orphanAttempts: await scalar(`
      select count(*)
      from public.attempts attempt
      left join public.users app_user on app_user.id = attempt.user_id
      where app_user.id is null
    `),
    orphanEnrollments: await scalar(`
      select count(*)
      from public.course_enrollments enrollment
      left join public.users app_user on app_user.id = enrollment.student_id
      left join public.course_classes course_class on course_class.id = enrollment.class_id
      where app_user.id is null or course_class.id is null
    `),
    orphanSubmissions: await scalar(`
      select count(*)
      from public.assignment_submissions submission
      left join public.users app_user on app_user.id = submission.student_id
      left join public.course_assignments assignment on assignment.id = submission.assignment_id
      where app_user.id is null or assignment.id is null
    `)
  };

  console.table(checks);
  const failures = Object.entries(checks).filter(([, count]) => count !== 0);
  if (strict && failures.length) {
    throw new Error(
      `Supabase migration verification failed: ${failures.map(([name]) => name).join(', ')}`
    );
  }

  if (failures.length) {
    console.warn('Run with --strict after the live data and Auth migration are complete.');
  } else {
    console.log('Supabase migration verification passed.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
