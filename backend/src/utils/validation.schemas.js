import { z } from "zod";

const optionalAssetUrlSchema = z
  .string()
  .url()
  .or(z.string().startsWith("/"))
  .or(z.string().startsWith("data:image/"))
  .nullable()
  .optional();

const questionOptionSchema = z.object({
  label: z.string().min(1).max(5),
  text: z.string().min(1),
  imageUrl: optionalAssetUrlSchema,
  isCorrect: z.boolean().optional(),
  order: z.number().int().nonnegative().optional(),
});

export const optionSchema = questionOptionSchema.extend({
  questionId: z.string().min(1),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores.")
    .nullable()
    .optional(),
  avatarUrl: optionalAssetUrlSchema,
});

export const examSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  type: z.enum(["FULL_LENGTH", "PRACTICE", "CUSTOM"]),
  accessType: z.enum(["FREE", "PAID"]).optional(),
  contentMode: z.enum(["REAL_EXAM", "QUESTION_HUB"]).optional(),
  source: z.enum(["MONOPREP", "OFFICIAL"]).optional(),
  competitionKind: z.enum(["NONE", "FULL", "MATH", "ENGLISH"]).optional(),
    competitionStartsAt: z.coerce.date().nullable().optional(),
    competitionEndsAt: z.coerce.date().nullable().optional(),
    referenceText: z.string().max(20000).nullable().optional(),
    totalDuration: z.number().int().positive(),
  isPublished: z.boolean().optional(),
});

export const sectionSchema = z.object({
  examId: z.string().min(1),
  title: z.string().min(2),
  type: z.enum(["reading_writing", "math", "custom_practice"]),
  duration: z.number().int().positive(),
  order: z.number().int().nonnegative(),
});

export const sectionUpdateSchema = sectionSchema.partial().extend({
  examId: z.string().min(1).optional(),
});

export const passageSchema = z.object({
  title: z.string().max(240).optional(),
  content: z.string().max(100000),
  category: z.string().min(2),
  attachmentUrl: optionalAssetUrlSchema,
  attachmentName: z.string().min(1).max(255).nullable().optional(),
  attachmentMimeType: z.enum([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ]).nullable().optional(),
});

export const questionSchema = z.object({
  sectionId: z.string().min(1),
  passageId: z.string().min(1).nullable().optional(),
  type: z.enum([
    "single_choice",
    "multi_choice",
    "text_input",
    "passage_question",
    "audio_question",
    "math_question",
  ]),
  skill: z.string().min(2),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
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
  explanationImageUrl: optionalAssetUrlSchema,
  order: z.number().int().nonnegative(),
  options: z.array(questionOptionSchema).optional(),
});

export const questionUpdateSchema = questionSchema.partial().extend({
  sectionId: z.string().min(1).optional(),
});

export const startAttemptSchema = z.object({
  examId: z.string().min(1),
});

export const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.any(),
  timeSpent: z.number().int().nonnegative().optional(),
  markedForReview: z.boolean().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const attemptIdParamSchema = z.object({
  attemptId: z.string().min(1),
  id: z.string().min(1).optional(),
});

export const supportMessageSchema = z.object({
  subject: z.string().min(3).max(120),
  message: z.string().min(10).max(2000),
  pageUrl: z.string().max(500).optional(),
});

export const desmosLessonSchema = z.object({
  title: z.string().min(3).max(160),
  summary: z.string().min(10).max(600),
  theory: z.string().min(20).max(20000),
  imageUrl: optionalAssetUrlSchema,
  imageUrls: z.array(
    z.string().url().or(z.string().startsWith("/"))
  ).max(8).optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const desmosLessonUpdateSchema = desmosLessonSchema.partial();

export const blitzStartSchema = z.object({
  size: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  subject: z.enum(["Mixed", "Math", "Reading & Writing"]).optional(),
});

export const blitzSubmitSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1),
    answer: z.any(),
  })).max(15),
});

const questionBankChoiceSchema = z.object({
  label: z.string().min(1).max(5),
  text: z.string().min(1).max(2000),
  imageUrl: optionalAssetUrlSchema,
});

export const questionBankItemSchema = z.object({
  sourceQuestionId: z.string().min(1).max(120).optional(),
  subject: z.enum(["Math", "Reading & Writing"]),
  domain: z.string().min(2).max(120),
  skill: z.string().min(2).max(120),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  prompt: z.string().min(5),
  choices: z.array(questionBankChoiceSchema).nullable().optional(),
  correctAnswer: z.any(),
  explanation: z.string().max(3000).nullable().optional(),
  isBluebook: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const questionBankItemUpdateSchema = questionBankItemSchema.partial();

export const questionHubProgressSchema = z.object({
  questionKey: z.string().min(1).max(240),
  answer: z.any().nullable().optional(),
  answered: z.boolean().optional(),
  correct: z.boolean().nullable().optional(),
  marked: z.boolean().optional(),
  attempts: z.number().int().min(0).max(100000).optional(),
  timeSpent: z.number().int().min(0).max(31536000).optional(),
});
