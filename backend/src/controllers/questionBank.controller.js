import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

const QUESTION_COPY_ID_PREFIX = 'question_copy_';

const domainAliases = [
  {
    subject: 'Math',
    domain: 'Algebra',
    patterns: ['algebra', 'linear', 'equation', 'inequality', 'system']
  },
  {
    subject: 'Math',
    domain: 'Advanced Math',
    patterns: ['advanced', 'quadratic', 'polynomial', 'function', 'exponential']
  },
  {
    subject: 'Math',
    domain: 'Problem-Solving and Data Analysis',
    patterns: ['data', 'statistic', 'ratio', 'percent', 'probability', 'problem']
  },
  {
    subject: 'Math',
    domain: 'Geometry and Trigonometry',
    patterns: ['geometry', 'trigonometry', 'circle', 'triangle', 'angle', 'area', 'volume']
  },
  {
    subject: 'Reading & Writing',
    domain: 'Information and Ideas',
    patterns: ['information', 'central', 'idea', 'evidence', 'inference', 'command']
  },
  {
    subject: 'Reading & Writing',
    domain: 'Craft and Structure',
    patterns: ['craft', 'structure', 'vocabulary', 'words', 'context', 'purpose']
  },
  {
    subject: 'Reading & Writing',
    domain: 'Expression of Ideas',
    patterns: ['expression', 'transition', 'rhetorical', 'organization', 'revision']
  },
  {
    subject: 'Reading & Writing',
    domain: 'Standard English Conventions',
    patterns: ['standard', 'english', 'convention', 'grammar', 'punctuation', 'sentence']
  }
];

function cleanQuestionBankPayload(payload) {
  return {
    ...(payload.sourceQuestionId
      ? { id: `${QUESTION_COPY_ID_PREFIX}${payload.sourceQuestionId}` }
      : {}),
    subject: payload.subject,
    domain: payload.domain,
    skill: payload.skill,
    difficulty: payload.difficulty,
    prompt: payload.prompt,
    choices: payload.choices || null,
    correctAnswer: payload.correctAnswer,
    explanation: payload.explanation || null,
    isBluebook: payload.isBluebook ?? true,
    isActive: payload.isActive ?? true
  };
}

function titleCaseSkill(value = '') {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSubject(sectionType) {
  return sectionType === 'math' ? 'Math' : 'Reading & Writing';
}

function getDomain(subject, skill = '') {
  const normalized = String(skill).toLowerCase();
  const match = domainAliases.find((item) => item.subject === subject && item.patterns.some((pattern) => normalized.includes(pattern)));
  return match?.domain || (subject === 'Math' ? 'Algebra' : 'Information and Ideas');
}

function mapExamQuestionToHubItem(exam, section, question) {
  const subject = getSubject(section.type);
  const skill = titleCaseSkill(question.skill);

  return {
    id: `exam-question:${question.id}`,
    source: 'practice_exam',
    examId: exam.id,
    examTitle: exam.title,
    sectionId: section.id,
    questionId: question.id,
    subject,
    domain: getDomain(subject, question.skill),
    skill,
    difficulty: question.difficulty,
    prompt: question.questionText,
    passage: question.passage?.content || null,
    passageTitle: question.passage?.title || null,
    passageAttachmentUrl: question.passage?.attachmentUrl || null,
    passageAttachmentName: question.passage?.attachmentName || null,
    passageAttachmentMimeType: question.passage?.attachmentMimeType || null,
    questionType: question.type,
    imageUrl: question.imageUrl,
    formulaText: question.formulaText,
    tableData: question.tableData,
    calculatorAllowed: question.calculatorAllowed,
    choices: question.options.map((option) => ({
      label: option.label,
      text: option.text,
      imageUrl: option.imageUrl
    })),
    correctAnswer: question.correctAnswer,
    acceptedAnswers: question.acceptedAnswers,
    explanation: question.explanation,
    isBluebook: true,
    isActive: true,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt
  };
}

function matchesFilters(item, query) {
  return (!query.subject || item.subject === query.subject)
    && (!query.domain || item.domain === query.domain)
    && (!query.skill || item.skill === query.skill);
}

export async function listQuestionBankItems(req, res) {
  const includeInactive = req.user?.role === 'ADMIN' && req.query.includeInactive === 'true';
  const [adminItems, exams] = await Promise.all([
    prisma.questionBankItem.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true })
    },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }]
    }),
    prisma.exam.findMany({
      where: {
        isPublished: true,
        contentMode: 'QUESTION_HUB',
        ...(req.user?.role === 'ADMIN' ? {} : { accessType: 'FREE' }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sections: {
          where: { type: { not: 'listening' } },
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                passage: true,
                options: { orderBy: { order: 'asc' } }
              }
            }
          }
        }
      }
    })
  ]);

  const linkedQuestionIds = adminItems
    .map((item) => item.id.startsWith(QUESTION_COPY_ID_PREFIX)
      ? item.id.slice(QUESTION_COPY_ID_PREFIX.length)
      : null)
    .filter(Boolean);
  const legacyPrompts = adminItems
    .filter((item) => !item.id.startsWith(QUESTION_COPY_ID_PREFIX))
    .map((item) => item.prompt);
  const linkedQuestions = adminItems.length
    ? await prisma.question.findMany({
        where: {
          passageId: { not: null },
          OR: [
            ...(linkedQuestionIds.length ? [{ id: { in: linkedQuestionIds } }] : []),
            ...(legacyPrompts.length ? [{ questionText: { in: [...new Set(legacyPrompts)] } }] : [])
          ]
        },
        include: { passage: true },
        orderBy: { createdAt: 'desc' }
      })
    : [];
  const passageByPrompt = new Map(
    linkedQuestions
      .filter((question) => question.passage)
      .map((question) => [question.questionText, question.passage])
  );
  const passageByQuestionId = new Map(
    linkedQuestions
      .filter((question) => question.passage)
      .map((question) => [question.id, question.passage])
  );
  const enrichedAdminItems = adminItems.map((item) => {
    const sourceQuestionId = item.id.startsWith(QUESTION_COPY_ID_PREFIX)
      ? item.id.slice(QUESTION_COPY_ID_PREFIX.length)
      : null;
    const passage = (sourceQuestionId && passageByQuestionId.get(sourceQuestionId))
      || passageByPrompt.get(item.prompt);
    return {
      ...item,
      passage: passage?.content || null,
      passageTitle: passage?.title || null,
      passageAttachmentUrl: passage?.attachmentUrl || null,
      passageAttachmentName: passage?.attachmentName || null,
      passageAttachmentMimeType: passage?.attachmentMimeType || null
    };
  });
  const examItems = exams.flatMap((exam) => exam.sections.flatMap((section) => (
    section.questions.map((question) => mapExamQuestionToHubItem(exam, section, question))
  )));
  const items = [...enrichedAdminItems, ...examItems].filter((item) => matchesFilters(item, req.query));

  res.json({ items });
}

export async function listQuestionHubProgress(req, res) {
  const progress = await prisma.questionHubProgress.findMany({
    where: { userId: req.user.id },
    orderBy: { updatedAt: 'desc' }
  });

  res.json({ progress });
}

export async function upsertQuestionHubProgress(req, res) {
  const { questionKey, answer, ...progressFields } = req.body;
  const data = {
    ...progressFields,
    ...(answer !== undefined ? { answer } : {})
  };
  const progress = await prisma.questionHubProgress.upsert({
    where: {
      userId_questionKey: {
        userId: req.user.id,
        questionKey
      }
    },
    create: {
      userId: req.user.id,
      questionKey,
      ...data
    },
    update: data
  });

  res.json({ progress });
}

export async function createQuestionBankItem(req, res) {
  const data = cleanQuestionBankPayload(req.body);
  const { id: copyId, ...copyData } = data;
  const item = req.body.sourceQuestionId
    ? await prisma.questionBankItem.upsert({
        where: { id: copyId },
        create: data,
        update: copyData
      })
    : await prisma.questionBankItem.create({ data });

  res.status(201).json({ item });
}

export async function updateQuestionBankItem(req, res) {
  const existing = await prisma.questionBankItem.findUnique({ where: { id: req.params.id } });

  if (!existing) {
    throw new ApiError(404, 'Question bank item not found.');
  }

  const data = {};
  for (const key of [
    'subject',
    'domain',
    'skill',
    'difficulty',
    'prompt',
    'choices',
    'correctAnswer',
    'explanation',
    'isBluebook',
    'isActive'
  ]) {
    if (req.body[key] !== undefined) {
      data[key] = req.body[key] || (['choices', 'explanation'].includes(key) ? null : req.body[key]);
    }
  }

  const item = await prisma.questionBankItem.update({
    where: { id: req.params.id },
    data
  });

  res.json({ item });
}

export async function deleteQuestionBankItem(req, res) {
  await prisma.questionBankItem.delete({
    where: { id: req.params.id }
  });

  res.json({ message: 'Question bank item deleted successfully.' });
}
