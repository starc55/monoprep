import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { normalizeQuestionHubClassification } from '../utils/questionHubCatalog.js';

const QUESTION_COPY_ID_PREFIX = 'question_copy_';

function cleanQuestionBankPayload(payload) {
  const classification = normalizeQuestionHubClassification(payload.subject, payload.domain, payload.skill);
  return {
    ...(payload.sourceQuestionId
      ? { id: `${QUESTION_COPY_ID_PREFIX}${payload.sourceQuestionId}` }
      : {}),
    subject: payload.subject,
    domain: classification.domain,
    skill: classification.skill,
    difficulty: payload.difficulty,
    prompt: payload.prompt,
    choices: payload.choices || null,
    correctAnswer: payload.correctAnswer,
    explanation: payload.explanation || null,
    isBluebook: payload.isBluebook ?? true,
    isActive: payload.isActive ?? true
  };
}

function getSubject(sectionType) {
  return sectionType === 'math' ? 'Math' : 'Reading & Writing';
}

function mapExamQuestionToHubItem(exam, section, question) {
  const subject = getSubject(section.type);
  const classification = normalizeQuestionHubClassification(subject, '', question.skill);

  return {
    id: `exam-question:${question.id}`,
    source: 'practice_exam',
    examId: exam.id,
    examTitle: exam.title,
    sectionId: section.id,
    questionId: question.id,
    subject,
    domain: classification.domain,
    skill: classification.skill,
    difficulty: question.difficulty,
    prompt: question.questionText,
    passage: question.passage?.content || null,
    passageTitle: question.passage?.title || null,
    passageAttachmentUrl: question.passage?.attachmentUrl || null,
    passageAttachmentName: question.passage?.attachmentName || null,
    passageAttachmentMimeType: question.passage?.attachmentMimeType || null,
    questionType: question.type,
    imageUrl: question.imageUrl,
    imagePlacement: question.imagePlacement,
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
          OR: [
            ...(linkedQuestionIds.length ? [{ id: { in: linkedQuestionIds } }] : []),
            ...(legacyPrompts.length ? [{ questionText: { in: [...new Set(legacyPrompts)] } }] : [])
          ]
        },
        include: { passage: true },
        orderBy: { createdAt: 'desc' }
      })
    : [];
  const questionByPrompt = new Map(
    linkedQuestions.map((question) => [question.questionText, question])
  );
  const questionById = new Map(
    linkedQuestions.map((question) => [question.id, question])
  );
  const enrichedAdminItems = adminItems.map((item) => {
    const sourceQuestionId = item.id.startsWith(QUESTION_COPY_ID_PREFIX)
      ? item.id.slice(QUESTION_COPY_ID_PREFIX.length)
      : null;
    const sourceQuestion = (sourceQuestionId && questionById.get(sourceQuestionId))
      || questionByPrompt.get(item.prompt);
    const passage = sourceQuestion?.passage;
    const classification = normalizeQuestionHubClassification(item.subject, item.domain, item.skill);
    return {
      ...item,
      ...classification,
      passage: passage?.content || null,
      passageTitle: passage?.title || null,
      passageAttachmentUrl: passage?.attachmentUrl || null,
      passageAttachmentName: passage?.attachmentName || null,
      passageAttachmentMimeType: passage?.attachmentMimeType || null,
      questionType: sourceQuestion?.type || null,
      imageUrl: sourceQuestion?.imageUrl || null,
      imagePlacement: sourceQuestion?.imagePlacement || 'ABOVE',
      formulaText: sourceQuestion?.formulaText || null,
      tableData: sourceQuestion?.tableData || null,
      calculatorAllowed: sourceQuestion?.calculatorAllowed || false,
      acceptedAnswers: sourceQuestion?.acceptedAnswers || null
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

  if (req.body.subject !== undefined || req.body.domain !== undefined || req.body.skill !== undefined) {
    const subject = req.body.subject ?? existing.subject;
    const skill = req.body.skill ?? existing.skill;
    const domain = req.body.domain ?? existing.domain;
    Object.assign(data, normalizeQuestionHubClassification(subject, domain, skill));
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
