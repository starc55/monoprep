export const defaultAchievements = [
  {
    code: 'FIRST_TEST',
    title: 'First Test Completed',
    description: 'Submit your first SAT practice attempt.',
    icon: 'Rocket',
    condition: { type: 'completed_tests', value: 1 }
  },
  {
    code: 'FIVE_TESTS',
    title: '5 Tests Completed',
    description: 'Complete five SAT attempts.',
    icon: 'BadgeCheck',
    condition: { type: 'completed_tests', value: 5 }
  },
  {
    code: 'TEN_TESTS',
    title: '10 Tests Completed',
    description: 'Complete ten SAT attempts.',
    icon: 'Trophy',
    condition: { type: 'completed_tests', value: 10 }
  },
  {
    code: 'SCORE_1000',
    title: 'Score 1000+',
    description: 'Reach a total SAT estimate of 1000 or higher.',
    icon: 'Flame',
    condition: { type: 'best_score', value: 1000 }
  },
  {
    code: 'SCORE_1200',
    title: 'Score 1200+',
    description: 'Reach a total SAT estimate of 1200 or higher.',
    icon: 'Crown',
    condition: { type: 'best_score', value: 1200 }
  },
  {
    code: 'SCORE_IMPROVED',
    title: 'Score Improved',
    description: 'Submit a test that improves on your previous best score.',
    icon: 'TrendingUp',
    condition: { type: 'score_improved' }
  },
  {
    code: 'MATH_MASTER',
    title: 'Math Master',
    description: 'Reach 700+ on Math.',
    icon: 'Sigma',
    condition: { type: 'math_score', value: 700 }
  },
  {
    code: 'READING_CHAMPION',
    title: 'Reading Champion',
    description: 'Reach 700+ on Reading and Writing.',
    icon: 'BookOpen',
    condition: { type: 'reading_score', value: 700 }
  },
  {
    code: 'SEVEN_DAY_STREAK',
    title: '7 Day Streak',
    description: 'Keep studying for seven days.',
    icon: 'Zap',
    condition: { type: 'study_streak', value: 7 }
  }
];
