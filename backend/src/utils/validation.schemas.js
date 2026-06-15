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

export const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(64),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(64),
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
  title: z.string().min(2),
  content: z.string().min(20),
  category: z.string().min(2),
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

export const mentorSchema = z.object({
  name: z.string().min(2).max(120),
  subject: z.string().min(2).max(120),
  bio: z.string().max(800).nullable().optional(),
  imageUrl: optionalAssetUrlSchema,
  telegram: z.string().max(120).nullable().optional(),
  phone: z.string().max(80).nullable().optional(),
  slots: z.array(z.string().min(1).max(40)).optional(),
  rating: z.number().min(0).max(5).optional(),
  isActive: z.boolean().optional(),
});

export const mentorUpdateSchema = mentorSchema.partial();

const questionBankChoiceSchema = z.object({
  label: z.string().min(1).max(5),
  text: z.string().min(1).max(2000),
});

export const questionBankItemSchema = z.object({
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
