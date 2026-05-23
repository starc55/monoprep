import { z } from 'zod';

const questionOptionSchema = z.object({
  label: z.string().min(1).max(5),
  text: z.string().min(1),
  isCorrect: z.boolean().optional(),
  order: z.number().int().nonnegative().optional()
});

const optionalAssetUrlSchema = z.string().url().or(z.string().startsWith('/')).nullable().optional();

export const optionSchema = questionOptionSchema.extend({
  questionId: z.string().min(1)
});

export const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(64)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(64)
});

export const examSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  type: z.enum(['FULL_LENGTH', 'PRACTICE', 'CUSTOM']),
  totalDuration: z.number().int().positive(),
  isPublished: z.boolean().optional()
});

export const sectionSchema = z.object({
  examId: z.string().min(1),
  title: z.string().min(2),
  type: z.enum(['reading_writing', 'math', 'listening', 'custom_practice']),
  duration: z.number().int().positive(),
  order: z.number().int().nonnegative()
});

export const sectionUpdateSchema = sectionSchema.partial().extend({
  examId: z.string().min(1).optional()
});

export const passageSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(20),
  category: z.string().min(2)
});

export const questionSchema = z.object({
  sectionId: z.string().min(1),
  passageId: z.string().min(1).nullable().optional(),
  type: z.enum([
    'single_choice',
    'multi_choice',
    'text_input',
    'passage_question',
    'audio_question',
    'math_question'
  ]),
  skill: z.string().min(2),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  questionText: z.string().min(3),
  audioUrl: optionalAssetUrlSchema,
  audioTitle: z.string().max(160).nullable().optional(),
  instructions: z.string().max(1000).nullable().optional(),
  imageUrl: optionalAssetUrlSchema,
  formulaText: z.string().max(2000).nullable().optional(),
  tableData: z.any().nullable().optional(),
  calculatorAllowed: z.boolean().optional(),
  transcript: z.string().max(10000).nullable().optional(),
  audioReplayLimit: z.number().int().min(0).max(2).nullable().optional(),
  acceptedAnswers: z.array(z.string().min(1)).nullable().optional(),
  correctAnswer: z.any(),
  explanation: z.string().min(5),
  order: z.number().int().nonnegative(),
  options: z.array(questionOptionSchema).optional()
});

export const questionUpdateSchema = questionSchema.partial().extend({
  sectionId: z.string().min(1).optional()
});

export const startAttemptSchema = z.object({
  examId: z.string().min(1)
});

export const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.any(),
  timeSpent: z.number().int().nonnegative().optional(),
  markedForReview: z.boolean().optional()
});

export const idParamSchema = z.object({
  id: z.string().min(1)
});

export const attemptIdParamSchema = z.object({
  attemptId: z.string().min(1),
  id: z.string().min(1).optional()
});

export const supportMessageSchema = z.object({
  subject: z.string().min(3).max(120),
  message: z.string().min(10).max(2000),
  pageUrl: z.string().max(500).optional()
});
