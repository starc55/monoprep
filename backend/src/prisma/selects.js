export const questionDeepInclude = {
  passage: true,
  options: {
    orderBy: [
      { order: "asc" },
      { label: "asc" },
    ],
  },
};

export const examDeepInclude = {
  sections: {
    orderBy: { order: "asc" },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: questionDeepInclude,
      },
    },
  },
};

export const attemptReviewInclude = {
  exam: {
    include: examDeepInclude,
  },
  answers: {
    include: {
      question: {
        include: {
          ...questionDeepInclude,
          section: true,
        },
      },
    },
  },
  aiFeedback: true,
};