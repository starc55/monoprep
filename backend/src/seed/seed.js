import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { defaultAchievements } from '../constants/achievements.js';

const prisma = new PrismaClient();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for seeding.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAuthUserByEmail(email) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  if (error) throw error;

  const existingUser = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    if (deleteError) throw deleteError;
  }
}

async function createSeedUser({ fullName, email, password, role }) {
  const {
    data: { user: authUser },
    error
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });
  if (error || !authUser) {
    throw error || new Error(`Could not create seed auth user: ${email}`);
  }

  return prisma.user.upsert({
    where: { email },
    update: {
      authUserId: authUser.id,
      fullName,
      role,
      status: 'ACTIVE',
      passwordHash: null
    },
    create: {
      id: authUser.id,
      authUserId: authUser.id,
      fullName,
      email,
      role,
      status: 'ACTIVE'
    }
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The destructive seed script cannot run in production.');
  }
  if (process.env.SEED_ALLOW_RESET !== 'true') {
    throw new Error('Set SEED_ALLOW_RESET=true to confirm the destructive local seed reset.');
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const studentPassword = process.env.SEED_STUDENT_PASSWORD;
  if (!adminPassword || adminPassword.length < 12 || !studentPassword || studentPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD and SEED_STUDENT_PASSWORD must each contain at least 12 characters.');
  }

  await deleteAuthUserByEmail('admin@satai.com');
  await deleteAuthUserByEmail('student@satai.com');

  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.aIFeedback.deleteMany();
  await prisma.userAnswer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.section.deleteMany();
  await prisma.passage.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.user.deleteMany();

  const admin = await createSeedUser({
    fullName: 'Admin User',
    email: 'admin@satai.com',
    password: adminPassword,
    role: 'ADMIN'
  });

  const student = await createSeedUser({
    fullName: 'Student Demo',
    email: 'student@satai.com',
    password: studentPassword,
    role: 'STUDENT'
  });

  await Promise.all(
    defaultAchievements.map((achievement) =>
      prisma.achievement.upsert({
        where: { code: achievement.code },
        update: achievement,
        create: achievement
      })
    )
  );

  const exam = await prisma.exam.create({
    data: {
      title: 'SAT Diagnostic Simulation 01',
      description:
        'A realistic multi-section SAT-style practice exam with reading, writing, math, and listening-style items.',
      type: 'FULL_LENGTH',
      accessType: 'FREE',
      totalDuration: 87,
      isPublished: true
    }
  });

  const readingPassage = await prisma.passage.create({
    data: {
      title: 'Urban Gardens and Community Health',
      category: 'reading',
      content:
        'In several U.S. cities, community leaders have transformed vacant lots into shared gardens. Researchers found that these spaces do more than supply vegetables. They become places where neighbors exchange information, children learn stewardship, and residents feel a stronger sense of ownership over public space. Although gardens alone do not solve structural inequality, they can create conditions that support healthier routines and stronger local networks.'
    }
  });

  const writingPassage = await prisma.passage.create({
    data: {
      title: 'Revision Memo: Student Research Article',
      category: 'writing',
      content:
        'The student writer argues that electric buses can reduce both long-term operating costs and neighborhood air pollution. However, the current draft repeats background information and introduces evidence without explaining why that evidence matters to the central claim.'
    }
  });

  const readingSection = await prisma.section.create({
    data: {
      examId: exam.id,
      title: 'Reading and Writing Module',
      type: 'reading_writing',
      duration: 32,
      order: 1
    }
  });

  const mathSection = await prisma.section.create({
    data: {
      examId: exam.id,
      title: 'Math Module',
      type: 'math',
      duration: 35,
      order: 2
    }
  });

  const listeningSection = await prisma.section.create({
    data: {
      examId: exam.id,
      title: 'Listening Practice Module',
      type: 'listening',
      duration: 20,
      order: 3
    }
  });

  const q1 = await prisma.question.create({
    data: {
      sectionId: readingSection.id,
      passageId: readingPassage.id,
      type: 'passage_question',
      skill: 'main_idea',
      difficulty: 'MEDIUM',
      questionText:
        'Which choice best states the central idea of the passage about community gardens?',
      correctAnswer: { value: 'B' },
      explanation:
        'The passage emphasizes that gardens build social connection and healthier routines in addition to producing food.',
      order: 1
    }
  });

  await prisma.option.createMany({
    data: [
      {
        questionId: q1.id,
        label: 'A',
        text: 'Community gardens should replace all city parks.',
        isCorrect: false
      },
      {
        questionId: q1.id,
        label: 'B',
        text: 'Community gardens can strengthen neighborhoods while supporting healthier habits.',
        isCorrect: true
      },
      {
        questionId: q1.id,
        label: 'C',
        text: 'Researchers disagree about whether fresh vegetables are useful.',
        isCorrect: false
      },
      {
        questionId: q1.id,
        label: 'D',
        text: 'Vacant lots are difficult to transform into any public space.',
        isCorrect: false
      }
    ]
  });

  const q2 = await prisma.question.create({
    data: {
      sectionId: readingSection.id,
      passageId: writingPassage.id,
      type: 'single_choice',
      skill: 'rhetoric',
      difficulty: 'MEDIUM',
      questionText:
        "Which revision would most improve the cohesion of the student's article?",
      correctAnswer: { value: 'C' },
      explanation:
        'The strongest revision explains how the evidence supports the claim, improving cohesion and argument flow.',
      order: 2
    }
  });

  await prisma.option.createMany({
    data: [
      {
        questionId: q2.id,
        label: 'A',
        text: 'Add a longer definition of public transit near the end of the draft.',
        isCorrect: false
      },
      {
        questionId: q2.id,
        label: 'B',
        text: "Repeat the article's introduction at the start of each paragraph.",
        isCorrect: false
      },
      {
        questionId: q2.id,
        label: 'C',
        text: 'After each piece of evidence, explain how it supports the claim about buses.',
        isCorrect: true
      },
      {
        questionId: q2.id,
        label: 'D',
        text: 'Remove all background information, including the thesis statement.',
        isCorrect: false
      }
    ]
  });

  const q3 = await prisma.question.create({
    data: {
      sectionId: readingSection.id,
      passageId: writingPassage.id,
      type: 'multi_choice',
      skill: 'grammar',
      difficulty: 'EASY',
      questionText:
        'Select all choices that are grammatically correct completions of the sentence.',
      correctAnswer: { values: ['A', 'D'] },
      explanation:
        'Choices A and D maintain agreement and correct punctuation while preserving the sentence meaning.',
      order: 3
    }
  });

  await prisma.option.createMany({
    data: [
      {
        questionId: q3.id,
        label: 'A',
        text: 'The study, which surveyed 400 students, was published last year.',
        isCorrect: true
      },
      {
        questionId: q3.id,
        label: 'B',
        text: 'The study which surveyed 400 students, were published last year.',
        isCorrect: false
      },
      {
        questionId: q3.id,
        label: 'C',
        text: 'The study, which surveyed 400 students were published last year.',
        isCorrect: false
      },
      {
        questionId: q3.id,
        label: 'D',
        text: 'Last year, the study that surveyed 400 students was published.',
        isCorrect: true
      }
    ]
  });

  const q4 = await prisma.question.create({
    data: {
      sectionId: mathSection.id,
      type: 'math_question',
      skill: 'linear_equations',
      difficulty: 'EASY',
      questionText: 'If 3x + 5 = 20, what is the value of x?',
      formulaText: 'Linear equation reference: ax + b = c, so x = (c - b) / a.',
      calculatorAllowed: true,
      correctAnswer: { value: '5' },
      explanation: 'Subtract 5 from both sides to get 3x = 15, then divide by 3.',
      order: 1
    }
  });

  await prisma.option.createMany({
    data: [
      { questionId: q4.id, label: 'A', text: '3', isCorrect: false },
      { questionId: q4.id, label: 'B', text: '5', isCorrect: true },
      { questionId: q4.id, label: 'C', text: '15', isCorrect: false },
      { questionId: q4.id, label: 'D', text: '25', isCorrect: false }
    ]
  });

  const q5 = await prisma.question.create({
    data: {
      sectionId: mathSection.id,
      type: 'text_input',
      skill: 'advanced_math',
      difficulty: 'MEDIUM',
      questionText:
        'A rectangle has side lengths (x + 2) and (x + 3) and area 30. If x is positive, what is x?',
      formulaText: 'Area of a rectangle = length x width',
      calculatorAllowed: true,
      acceptedAnswers: ['3', '3.0'],
      correctAnswer: { acceptedAnswers: ['3'] },
      explanation:
        'Set (x + 2)(x + 3) = 30, expand to x^2 + 5x - 24 = 0, and solve for the positive value x = 3.',
      order: 2
    }
  });

  const q6 = await prisma.question.create({
    data: {
      sectionId: mathSection.id,
      type: 'math_question',
      skill: 'statistics',
      difficulty: 'HARD',
      questionText:
        'The graph and table describe a linear trend. Which statement is best supported by the data?',
      imageUrl: '/uploads/images/positive-trend-graph.svg',
      tableData: {
        headers: ['Hours studied', 'Practice score'],
        rows: [['1', '510'], ['2', '545'], ['3', '585'], ['4', '620']]
      },
      calculatorAllowed: true,
      correctAnswer: { value: 'C' },
      explanation:
        'The plotted points and table both show scores increasing at a fairly steady rate as study hours increase.',
      order: 3
    }
  });

  await prisma.option.createMany({
    data: [
      {
        questionId: q6.id,
        label: 'A',
        text: 'Scores decrease as study hours increase.',
        isCorrect: false
      },
      {
        questionId: q6.id,
        label: 'B',
        text: 'The data show no association between hours and score.',
        isCorrect: false
      },
      {
        questionId: q6.id,
        label: 'C',
        text: 'The relationship is approximately linear with a positive slope.',
        isCorrect: true
      },
      {
        questionId: q6.id,
        label: 'D',
        text: 'A negative-slope line would clearly fit the data best.',
        isCorrect: false
      }
    ]
  });

  const q7 = await prisma.question.create({
    data: {
      sectionId: listeningSection.id,
      type: 'audio_question',
      skill: 'detail',
      difficulty: 'MEDIUM',
      questionText:
        'According to the audio summary, why did the speaker recommend starting with a short review plan?',
      audioUrl: '/uploads/audio/sample-listening.wav',
      audioTitle: 'Building a Consistent Review Routine',
      instructions: 'Listen to the recording, then select the best answer. The recording may be replayed once.',
      transcript:
        'The speaker recommends beginning with a short review plan because consistency is easier to maintain when the daily task feels manageable.',
      audioReplayLimit: 1,
      correctAnswer: { value: 'A' },
      explanation:
        'The speaker explains that a shorter plan is easier to sustain consistently over time.',
      order: 1
    }
  });

  await prisma.option.createMany({
    data: [
      {
        questionId: q7.id,
        label: 'A',
        text: 'Because a short plan is easier to maintain consistently.',
        isCorrect: true
      },
      {
        questionId: q7.id,
        label: 'B',
        text: 'Because students should avoid reviewing every day.',
        isCorrect: false
      },
      {
        questionId: q7.id,
        label: 'C',
        text: 'Because longer plans guarantee higher scores immediately.',
        isCorrect: false
      },
      {
        questionId: q7.id,
        label: 'D',
        text: 'Because short plans are required by all SAT programs.',
        isCorrect: false
      }
    ]
  });

  const q8 = await prisma.question.create({
    data: {
      sectionId: listeningSection.id,
      type: 'audio_question',
      skill: 'inference',
      difficulty: 'MEDIUM',
      questionText:
        "What can best be inferred about the speaker's view of timed practice?",
      audioUrl: '/uploads/audio/sample-listening.wav',
      audioTitle: 'Timed Practice and Reflection',
      instructions: 'Listen carefully and choose the inference best supported by the speaker.',
      transcript:
        'Timed practice is valuable, the speaker explains, only when students later examine the errors that slowed them down.',
      audioReplayLimit: 2,
      correctAnswer: { value: 'D' },
      explanation:
        'The speaker presents timed practice as useful when paired with review rather than as a standalone solution.',
      order: 2
    }
  });

  await prisma.option.createMany({
    data: [
      {
        questionId: q8.id,
        label: 'A',
        text: 'Timed practice is not useful for any student.',
        isCorrect: false
      },
      {
        questionId: q8.id,
        label: 'B',
        text: 'Timed practice matters only for math questions.',
        isCorrect: false
      },
      {
        questionId: q8.id,
        label: 'C',
        text: 'Students should delay timed work until the final week.',
        isCorrect: false
      },
      {
        questionId: q8.id,
        label: 'D',
        text: 'Timed practice is valuable when students also review their mistakes carefully.',
        isCorrect: true
      }
    ]
  });

  console.log('Seed complete.');
  console.log(`Admin account created: ${admin.email}`);
  console.log(`Student account created: ${student.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
