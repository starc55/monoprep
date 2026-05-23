import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

async function validateQuestionForSection(questionData, options, existingQuestion = null) {
  const sectionId = questionData.sectionId || existingQuestion?.sectionId;
  const section = await prisma.section.findUnique({ where: { id: sectionId } });

  if (!section) {
    throw new ApiError(400, 'Select a valid section before saving a question.');
  }

  const type = questionData.type || existingQuestion?.type;
  const passageId = questionData.passageId !== undefined
    ? questionData.passageId
    : existingQuestion?.passageId;
  const audioUrl = questionData.audioUrl !== undefined
    ? questionData.audioUrl
    : existingQuestion?.audioUrl;
  const acceptedAnswers = questionData.acceptedAnswers !== undefined
    ? questionData.acceptedAnswers
    : existingQuestion?.acceptedAnswers;

  if (section.type === 'reading_writing' && !passageId) {
    throw new ApiError(400, 'Reading and Writing questions require a passage.');
  }

  if (section.type === 'listening' && (!audioUrl || type !== 'audio_question')) {
    throw new ApiError(400, 'Listening questions require an audio source.');
  }

  if (section.type === 'math' && !['single_choice', 'text_input', 'math_question'].includes(type)) {
    throw new ApiError(400, 'Math questions must use multiple choice or student-produced response.');
  }

  if (type === 'text_input' && (!Array.isArray(acceptedAnswers) || !acceptedAnswers.length)) {
    throw new ApiError(400, 'Text input questions require accepted answers.');
  }

  if (Array.isArray(options) && type !== 'text_input' && options.length < 2) {
    throw new ApiError(400, 'Multiple choice questions require answer choices.');
  }
}

export async function listQuestions(req, res) {
  const questions = await prisma.question.findMany({
    include: {
      options: {
        orderBy: [{ order: 'asc' }, { label: 'asc' }]
      },
      passage: true,
      section: {
        include: {
          exam: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ questions });
}

export async function createQuestion(req, res) {
  const { options = [], ...questionData } = req.body;
  await validateQuestionForSection(questionData, options);
  const question = await prisma.question.create({
    data: {
      ...questionData,
      options: options.length
        ? {
            create: options
          }
        : undefined
    },
    include: {
      options: {
        orderBy: [{ order: 'asc' }, { label: 'asc' }]
      },
      passage: true
    }
  });

  res.status(201).json({ question });
}

export async function updateQuestion(req, res) {
  const { options, ...questionData } = req.body;
  const existingQuestion = await prisma.question.findUnique({ where: { id: req.params.id } });

  if (!existingQuestion) {
    throw new ApiError(404, 'Question not found.');
  }

  await validateQuestionForSection(questionData, options, existingQuestion);

  if (Array.isArray(options)) {
    await prisma.option.deleteMany({
      where: { questionId: req.params.id }
    });
  }

  const question = await prisma.question.update({
    where: { id: req.params.id },
    data: {
      ...questionData,
      options: Array.isArray(options)
        ? {
            create: options
          }
        : undefined
    },
    include: {
      options: {
        orderBy: [{ order: 'asc' }, { label: 'asc' }]
      },
      passage: true
    }
  });

  res.json({ question });
}

export async function deleteQuestion(req, res) {
  await prisma.question.delete({
    where: { id: req.params.id }
  });

  res.json({ message: 'Question deleted successfully.' });
}
