import { prisma } from '../config/prisma.js';
import { evaluateAnswer } from '../services/scoring.service.js';
import { calculateGamification } from '../services/gamification.service.js';
import { ApiError } from '../utils/apiError.js';

function shuffle(rows) {
  return rows
    .map((row) => ({ row, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ row }) => row);
}

function normalizeBankQuestion(item) {
  const choices = Array.isArray(item.choices) ? item.choices : [];
  return {
    questionId: `bank:${item.id}`,
    source: 'BANK',
    sourceId: item.id,
    subject: item.subject,
    domain: item.domain,
    skill: item.skill,
    difficulty: item.difficulty,
    prompt: item.prompt,
    choices,
    type: choices.length ? 'single_choice' : 'text_input',
    correctAnswer: item.correctAnswer,
    acceptedAnswers: null,
    explanation: item.explanation
  };
}

function normalizeExamQuestion(item) {
  return {
    questionId: `exam:${item.id}`,
    source: 'EXAM',
    sourceId: item.id,
    subject: item.section.type === 'math' ? 'Math' : 'Reading & Writing',
    domain: item.skill,
    skill: item.skill,
    difficulty: item.difficulty,
    prompt: item.questionText,
    choices: item.options.map((option) => ({
      label: option.label,
      text: option.text,
      imageUrl: option.imageUrl
    })),
    type: item.type,
    correctAnswer: item.correctAnswer,
    acceptedAnswers: item.acceptedAnswers,
    explanation: item.explanation
  };
}

function publicQuestion(question, includeReview = false) {
  const payload = {
    questionId: question.questionId,
    subject: question.subject,
    domain: question.domain,
    skill: question.skill,
    difficulty: question.difficulty,
    prompt: question.prompt,
    choices: question.choices
  };

  if (includeReview) {
    payload.correctAnswer = question.correctAnswer;
    payload.explanation = question.explanation;
  }
  return payload;
}

const arenaUserSelect = {
  id: true,
  fullName: true,
  username: true,
  avatarUrl: true
};

function publicArena(match, userId, questions = []) {
  const isChallenger = match.challengerId === userId;
  const opponent = isChallenger ? match.opponent : match.challenger;
  const ownScore = isChallenger ? match.challengerScore : match.opponentScore;
  const opponentScore = isChallenger ? match.opponentScore : match.challengerScore;
  const includeReview = match.status === 'COMPLETED';
  return {
    id: match.id,
    size: match.size,
    subject: match.subject,
    status: match.status,
    role: isChallenger ? 'CHALLENGER' : 'OPPONENT',
    opponent,
    ownScore,
    opponentScore,
    submitted: ownScore !== null,
    winnerId: match.winnerId,
    isWinner: match.status === 'COMPLETED' && match.winnerId === userId,
    isDraw: match.status === 'COMPLETED' && !match.winnerId,
    startedAt: match.startedAt,
    completedAt: match.completedAt,
    questions: questions.map((question) => publicQuestion(question, includeReview))
  };
}

async function getCandidateQuestions(subject = 'Mixed') {
  const bankWhere = {
    isActive: true,
    ...(subject !== 'Mixed' ? { subject } : {})
  };
  const examType = subject === 'Math' ? 'math' : subject === 'Reading & Writing' ? 'reading_writing' : undefined;

  const [bankItems, examItems] = await Promise.all([
    prisma.questionBankItem.findMany({ where: bankWhere, take: 100 }),
    prisma.question.findMany({
      where: {
        section: {
          exam: { isPublished: true },
          ...(examType ? { type: examType } : { type: { not: 'listening' } })
        }
      },
      include: { section: true, options: { orderBy: { order: 'asc' } } },
      take: 100
    })
  ]);

  return [
    ...bankItems.map(normalizeBankQuestion),
    ...examItems.map(normalizeExamQuestion)
  ];
}

async function hydrateQuestionRefs(refs = []) {
  const bankIds = refs.filter((ref) => ref.source === 'BANK').map((ref) => ref.id);
  const examIds = refs.filter((ref) => ref.source === 'EXAM').map((ref) => ref.id);
  const [bankItems, examItems] = await Promise.all([
    prisma.questionBankItem.findMany({ where: { id: { in: bankIds } } }),
    prisma.question.findMany({
      where: { id: { in: examIds } },
      include: { section: true, options: { orderBy: { order: 'asc' } } }
    })
  ]);
  const map = new Map([
    ...bankItems.map((item) => [`BANK:${item.id}`, normalizeBankQuestion(item)]),
    ...examItems.map((item) => [`EXAM:${item.id}`, normalizeExamQuestion(item)])
  ]);
  return refs.map((ref) => map.get(`${ref.source}:${ref.id}`)).filter(Boolean);
}

export async function getCompetitionOverview(req, res) {
  const now = new Date();
  const [events, attempts, blitzSessions, arenaMatches] = await Promise.all([
    prisma.exam.findMany({
      where: {
        isPublished: true,
        competitionKind: { not: 'NONE' },
        OR: [{ competitionEndsAt: null }, { competitionEndsAt: { gte: now } }]
      },
      orderBy: [{ competitionStartsAt: 'asc' }, { createdAt: 'desc' }],
      take: 12
    }),
    prisma.attempt.findMany({
      where: { userId: req.user.id, status: { not: 'IN_PROGRESS' } },
      include: { exam: { select: { type: true, competitionKind: true } } },
      orderBy: { submittedAt: 'desc' }
    }),
    prisma.blitzSession.findMany({
      where: { userId: req.user.id, status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      take: 20
    }),
    prisma.arenaMatch.findMany({
      where: { OR: [{ challengerId: req.user.id }, { opponentId: req.user.id }] },
      include: {
        challenger: { select: arenaUserSelect },
        opponent: { select: arenaUserSelect }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  const gamification = calculateGamification({ attempts, blitzSessions });

  res.json({
    cadence: {
      full: 'Monthly',
      math: 'Every 2 weeks',
      english: 'Every 2 weeks'
    },
    progress: {
      ...gamification,
      completedCompetitions: attempts.filter((attempt) => attempt.exam.competitionKind !== 'NONE').length,
      completedBlitz: gamification.completedBlitz
    },
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      kind: event.competitionKind,
      startsAt: event.competitionStartsAt,
      endsAt: event.competitionEndsAt,
      accessType: event.accessType,
      totalDuration: event.totalDuration
    })),
    recentBlitz: blitzSessions.slice(0, 5),
    recentArenas: arenaMatches.map((match) => publicArena(match, req.user.id))
  });
}

export async function joinArena(req, res) {
  const subject = req.body.subject || 'Mixed';
  const size = req.body.size;
  const existing = await prisma.arenaMatch.findFirst({
    where: {
      status: { in: ['WAITING', 'ACTIVE'] },
      OR: [{ challengerId: req.user.id }, { opponentId: req.user.id }]
    },
    include: {
      challenger: { select: arenaUserSelect },
      opponent: { select: arenaUserSelect }
    },
    orderBy: { createdAt: 'desc' }
  });
  if (existing) {
    const questions = existing.status === 'ACTIVE' ? await hydrateQuestionRefs(existing.questionRefs) : [];
    return res.json({ arena: publicArena(existing, req.user.id, questions) });
  }

  const waiting = await prisma.arenaMatch.findFirst({
    where: {
      status: 'WAITING',
      opponentId: null,
      challengerId: { not: req.user.id },
      subject,
      size
    },
    orderBy: { createdAt: 'asc' }
  });

  if (waiting) {
    const claimed = await prisma.arenaMatch.updateMany({
      where: { id: waiting.id, status: 'WAITING', opponentId: null },
      data: { opponentId: req.user.id, status: 'ACTIVE', startedAt: new Date() }
    });
    if (claimed.count) {
      const match = await prisma.arenaMatch.findUnique({
        where: { id: waiting.id },
        include: {
          challenger: { select: arenaUserSelect },
          opponent: { select: arenaUserSelect }
        }
      });
      const questions = await hydrateQuestionRefs(match.questionRefs);
      return res.json({ arena: publicArena(match, req.user.id, questions) });
    }
  }

  const candidates = await getCandidateQuestions(subject);
  if (candidates.length < size) {
    throw new ApiError(409, `At least ${size} published questions are required for this arena.`);
  }
  const selected = shuffle(candidates).slice(0, size);
  const match = await prisma.arenaMatch.create({
    data: {
      challengerId: req.user.id,
      size,
      subject,
      questionRefs: selected.map((question) => ({ source: question.source, id: question.sourceId }))
    },
    include: {
      challenger: { select: arenaUserSelect },
      opponent: { select: arenaUserSelect }
    }
  });
  return res.status(201).json({ arena: publicArena(match, req.user.id) });
}

export async function getArena(req, res) {
  const match = await prisma.arenaMatch.findFirst({
    where: {
      id: req.params.id,
      OR: [{ challengerId: req.user.id }, { opponentId: req.user.id }]
    },
    include: {
      challenger: { select: arenaUserSelect },
      opponent: { select: arenaUserSelect }
    }
  });
  if (!match) throw new ApiError(404, 'Arena match not found.');
  const questions = match.status === 'WAITING' ? [] : await hydrateQuestionRefs(match.questionRefs);
  res.json({ arena: publicArena(match, req.user.id, questions) });
}

export async function submitArena(req, res) {
  const match = await prisma.arenaMatch.findFirst({
    where: {
      id: req.params.id,
      status: 'ACTIVE',
      OR: [{ challengerId: req.user.id }, { opponentId: req.user.id }]
    },
    include: {
      challenger: { select: arenaUserSelect },
      opponent: { select: arenaUserSelect }
    }
  });
  if (!match) throw new ApiError(404, 'Active arena match not found.');

  const isChallenger = match.challengerId === req.user.id;
  if ((isChallenger ? match.challengerScore : match.opponentScore) !== null) {
    throw new ApiError(409, 'You already submitted this arena round.');
  }

  const questions = await hydrateQuestionRefs(match.questionRefs);
  const answerMap = new Map(req.body.answers.map((item) => [item.questionId, item.answer]));
  const results = questions.map((question) => ({
    questionId: question.questionId,
    answer: answerMap.get(question.questionId) ?? null,
    isCorrect: evaluateAnswer(question, answerMap.get(question.questionId))
  }));
  const correctCount = results.filter((result) => result.isCorrect).length;
  const score = Math.round((correctCount / match.size) * 100);
  const xpEarned = correctCount * 25 + (correctCount === match.size ? 75 : 0);
  const challengerScore = isChallenger ? score : match.challengerScore;
  const opponentScore = isChallenger ? match.opponentScore : score;
  const completed = challengerScore !== null && opponentScore !== null;
  const winnerId = completed
    ? challengerScore === opponentScore
      ? null
      : challengerScore > opponentScore ? match.challengerId : match.opponentId
    : null;

  const [updated] = await prisma.$transaction([
    prisma.arenaMatch.update({
      where: { id: match.id },
      data: {
        ...(isChallenger
          ? { challengerAnswers: results, challengerScore: score, challengerXp: xpEarned }
          : { opponentAnswers: results, opponentScore: score, opponentXp: xpEarned }),
        status: completed ? 'COMPLETED' : 'ACTIVE',
        winnerId,
        completedAt: completed ? new Date() : null
      },
      include: {
        challenger: { select: arenaUserSelect },
        opponent: { select: arenaUserSelect }
      }
    }),
    prisma.blitzSession.create({
      data: {
        userId: req.user.id,
        size: match.size,
        subject: `Arena: ${match.subject}`,
        status: 'SUBMITTED',
        questionRefs: match.questionRefs,
        answers: results,
        correctCount,
        score,
        xpEarned,
        submittedAt: new Date()
      }
    })
  ]);

  res.json({ arena: publicArena(updated, req.user.id, questions) });
}

export async function startBlitz(req, res) {
  const candidates = await getCandidateQuestions(req.body.subject || 'Mixed');
  if (candidates.length < req.body.size) {
    throw new ApiError(409, `At least ${req.body.size} published questions are required for this blitz.`);
  }

  const selected = shuffle(candidates).slice(0, req.body.size);
  const session = await prisma.blitzSession.create({
    data: {
      userId: req.user.id,
      size: req.body.size,
      subject: req.body.subject || 'Mixed',
      questionRefs: selected.map((question) => ({
        source: question.source,
        id: question.sourceId
      }))
    }
  });

  res.status(201).json({
    session: {
      ...session,
      questions: selected.map((question) => publicQuestion(question))
    }
  });
}

export async function getBlitzSession(req, res) {
  const session = await prisma.blitzSession.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });
  if (!session) throw new ApiError(404, 'Blitz session not found.');

  const questions = await hydrateQuestionRefs(session.questionRefs);
  res.json({
    session: {
      ...session,
      questions: questions.map((question) => publicQuestion(question, session.status === 'SUBMITTED'))
    }
  });
}

export async function submitBlitz(req, res) {
  const session = await prisma.blitzSession.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });
  if (!session) throw new ApiError(404, 'Blitz session not found.');
  if (session.status === 'SUBMITTED') throw new ApiError(409, 'This blitz has already been submitted.');

  const questions = await hydrateQuestionRefs(session.questionRefs);
  const answerMap = new Map(req.body.answers.map((item) => [item.questionId, item.answer]));
  const results = questions.map((question) => ({
    questionId: question.questionId,
    answer: answerMap.get(question.questionId) ?? null,
    isCorrect: evaluateAnswer(question, answerMap.get(question.questionId))
  }));
  const correctCount = results.filter((result) => result.isCorrect).length;
  const score = Math.round((correctCount / session.size) * 100);
  const xpEarned = correctCount * 20 + (correctCount === session.size ? 50 : 0);

  const updated = await prisma.blitzSession.update({
    where: { id: session.id },
    data: {
      status: 'SUBMITTED',
      answers: results,
      correctCount,
      score,
      xpEarned,
      submittedAt: new Date()
    }
  });

  res.json({
    session: {
      ...updated,
      questions: questions.map((question) => publicQuestion(question, true))
    }
  });
}
