function skill(value, label, aliases = []) {
  return { value, label, aliases };
}

function domain(value, skills, aliases = []) {
  return { value, label: value, aliases, skills };
}

export const QUESTION_HUB_CATALOG = {
  math: {
    subject: 'Math',
    domains: [
      domain('Algebra', [
        skill('linear_equations_in_one_variable', 'Linear Equations in One Variable', ['algebra', 'linear_equations']),
        skill('linear_functions', 'Linear Functions'),
        skill('linear_equations_in_two_variables', 'Linear Equations in Two Variables'),
        skill('systems_of_two_linear_equations', 'Systems of Two Linear Equations', ['linear_systems']),
        skill('linear_inequalities', 'Linear Inequalities')
      ]),
      domain('Advanced Math', [
        skill('nonlinear_functions', 'Nonlinear Functions', ['advanced_math', 'functions']),
        skill('nonlinear_equations_and_systems', 'Nonlinear Equations & Systems', ['nonlinear_equations_systems']),
        skill('equivalent_expressions', 'Equivalent Expressions')
      ]),
      domain('Problem-Solving & Data Analysis', [
        skill('ratios_rates_and_proportions', 'Ratios, Rates & Proportions', ['problem_solving', 'ratios', 'rates', 'proportions']),
        skill('percentages', 'Percentages', ['percent']),
        skill('one_variable_data', 'One-Variable Data', ['statistics']),
        skill('two_variable_data', 'Two-Variable Data'),
        skill('probability', 'Probability'),
        skill('inference_and_margin_of_error', 'Inference & Margin of Error', ['margin_of_error']),
        skill('evaluating_statistical_claims', 'Evaluating Statistical Claims')
      ], ['Problem-Solving and Data Analysis']),
      domain('Geometry & Trigonometry', [
        skill('area_and_volume', 'Area & Volume', ['geometry', 'area', 'volume']),
        skill('lines_angles_and_triangles', 'Lines, Angles & Triangles', ['lines_angles_triangles']),
        skill('right_triangles_and_trigonometry', 'Right Triangles & Trigonometry', ['trigonometry', 'right_triangles']),
        skill('circles', 'Circles', ['circle'])
      ], ['Geometry and Trigonometry'])
    ]
  },
  reading_writing: {
    subject: 'Reading & Writing',
    domains: [
      domain('Information & Ideas', [
        skill('central_ideas_and_details', 'Central Ideas & Details', ['main_idea', 'central_ideas_details', 'reading']),
        skill('inferences', 'Inferences', ['inference', 'analysis']),
        skill('command_of_evidence', 'Command of Evidence')
      ], ['Information and Ideas']),
      domain('Craft & Structure', [
        skill('words_in_context', 'Words in Context', ['vocabulary', 'words_context']),
        skill('text_structure_and_purpose', 'Text Structure & Purpose', ['text_structure_purpose']),
        skill('cross_text_connections', 'Cross-Text Connections', ['cross_text_connection'])
      ], ['Craft and Structure']),
      domain('Expression of Ideas', [
        skill('rhetorical_synthesis', 'Rhetorical Synthesis', ['rhetoric']),
        skill('transitions', 'Transitions')
      ]),
      domain('Standard English Conventions', [
        skill('boundaries', 'Boundaries', ['punctuation']),
        skill('form_structure_and_sense', 'Form, Structure & Sense', ['grammar', 'form_structure_sense'])
      ])
    ]
  }
};

function normalizeKey(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getCatalog(sectionTypeOrSubject) {
  if (QUESTION_HUB_CATALOG[sectionTypeOrSubject]) {
    return QUESTION_HUB_CATALOG[sectionTypeOrSubject];
  }
  return Object.values(QUESTION_HUB_CATALOG).find(
    (catalog) => normalizeKey(catalog.subject) === normalizeKey(sectionTypeOrSubject)
  );
}

function matchesEntry(entry, value) {
  const target = normalizeKey(value);
  return [entry.value, entry.label, ...(entry.aliases || [])]
    .some((candidate) => normalizeKey(candidate) === target);
}

export function getQuestionHubDomains(sectionTypeOrSubject) {
  return getCatalog(sectionTypeOrSubject)?.domains || [];
}

export function getQuestionHubSkills(sectionTypeOrSubject, domainValue) {
  return getQuestionHubDomains(sectionTypeOrSubject)
    .find((item) => matchesEntry(item, domainValue))?.skills || [];
}

export function getQuestionHubClassification(sectionTypeOrSubject, domainValue, skillValue) {
  const domains = getQuestionHubDomains(sectionTypeOrSubject);
  const skillMatch = domains.flatMap((item) => (
    item.skills.map((entry) => ({ domain: item, skill: entry }))
  )).find((entry) => matchesEntry(entry.skill, skillValue));

  if (skillMatch) {
    return { domain: skillMatch.domain.value, skill: skillMatch.skill.value };
  }

  const domainMatch = domains.find((item) => matchesEntry(item, domainValue)) || domains[0];
  return {
    domain: domainMatch?.value || '',
    skill: domainMatch?.skills[0]?.value || normalizeKey(skillValue)
  };
}

export function getQuestionHubSkillLabel(sectionTypeOrSubject, skillValue) {
  const match = getQuestionHubDomains(sectionTypeOrSubject)
    .flatMap((item) => item.skills)
    .find((item) => matchesEntry(item, skillValue));
  return match?.label || String(skillValue || '').replaceAll('_', ' ');
}

export function normalizeQuestionHubItem(item) {
  const classification = getQuestionHubClassification(item?.subject, item?.domain, item?.skill);
  return { ...item, ...classification };
}
