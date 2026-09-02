function buildRoadmap(weaknesses) {
  const topics = weaknesses.length ? weaknesses : ['mixed review'];
  return topics.slice(0, 4).map((topic, index) => ({
    week: index + 1,
    focus: topic,
    tasks: [
      `Review core concepts for ${topic}.`,
      'Complete one timed mini-set and review every error.',
      'Write a short reflection on the mistakes you repeated.'
    ]
  }));
}

export function buildFallbackFeedback(summary) {
  const totalSatScore = summary.totalScore > 100
    ? Math.round(summary.totalScore)
    : Math.round(400 + summary.totalScore * 12);
  const readingWritingSatScore = summary.readingWritingScore > 100
    ? Math.round(summary.readingWritingScore)
    : Math.round(200 + summary.readingWritingScore * 6);
  const mathSatScore = summary.mathScore > 100
    ? Math.round(summary.mathScore)
    : Math.round(200 + summary.mathScore * 6);
  const strengths = summary.skillBreakdown
    .filter((skill) => skill.accuracy >= 75)
    .map((skill) => skill.skill);
  const weaknesses = summary.skillBreakdown
    .filter((skill) => skill.accuracy < 70)
    .map((skill) => skill.skill);

  return {
    overallFeedback:
      totalSatScore >= 1360
        ? 'Strong overall performance with a solid command of core SAT skills.'
        : 'This attempt shows useful progress and a clear set of target areas for improvement.',
    estimatedScore: {
      total: totalSatScore,
      readingWriting: readingWritingSatScore,
      math: mathSatScore,
      listening: Math.round(summary.listeningScore)
    },
    strengths: strengths.length ? strengths : ['Consistent effort across the exam'],
    weaknesses: weaknesses.length ? weaknesses : ['Fine-tuning pacing and review habits'],
    skillBreakdown: summary.skillBreakdown,
    timeManagement:
      summary.timeSpent > summary.recommendedTime
        ? 'You used more time than the planned exam window. Focus on quicker elimination and moving on from stubborn items.'
        : 'Your pacing stayed close to the target window. Keep balancing speed with careful review.',
    questionAnalysis: summary.questionAnalysis,
    studyRoadmap: buildRoadmap(weaknesses),
    recommendedPractice: weaknesses.length
      ? weaknesses.map((skill) => `Targeted drill set for ${skill}`)
      : ['Mixed timed practice set', 'Review recent errors and explain the right answer aloud']
  };
}
