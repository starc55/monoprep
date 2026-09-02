const QUESTION_HUB_CATALOG = {
  Math: [
    ['Algebra', [
      ['linear_equations_in_one_variable', ['algebra', 'linear_equations']],
      ['linear_functions', []],
      ['linear_equations_in_two_variables', []],
      ['systems_of_two_linear_equations', ['linear_systems']],
      ['linear_inequalities', []]
    ], []],
    ['Advanced Math', [
      ['nonlinear_functions', ['advanced_math', 'functions']],
      ['nonlinear_equations_and_systems', ['nonlinear_equations_systems']],
      ['equivalent_expressions', []]
    ], []],
    ['Problem-Solving & Data Analysis', [
      ['ratios_rates_and_proportions', ['problem_solving', 'ratios', 'rates', 'proportions']],
      ['percentages', ['percent']],
      ['one_variable_data', ['statistics']],
      ['two_variable_data', []],
      ['probability', []],
      ['inference_and_margin_of_error', ['margin_of_error']],
      ['evaluating_statistical_claims', []]
    ], ['Problem-Solving and Data Analysis']],
    ['Geometry & Trigonometry', [
      ['area_and_volume', ['geometry', 'area', 'volume']],
      ['lines_angles_and_triangles', ['lines_angles_triangles']],
      ['right_triangles_and_trigonometry', ['trigonometry', 'right_triangles']],
      ['circles', ['circle']]
    ], ['Geometry and Trigonometry']]
  ],
  'Reading & Writing': [
    ['Information & Ideas', [
      ['central_ideas_and_details', ['main_idea', 'central_ideas_details', 'reading']],
      ['inferences', ['inference', 'analysis']],
      ['command_of_evidence', []]
    ], ['Information and Ideas']],
    ['Craft & Structure', [
      ['words_in_context', ['vocabulary', 'words_context']],
      ['text_structure_and_purpose', ['text_structure_purpose']],
      ['cross_text_connections', ['cross_text_connection']]
    ], ['Craft and Structure']],
    ['Expression of Ideas', [
      ['rhetorical_synthesis', ['rhetoric']],
      ['transitions', []]
    ], []],
    ['Standard English Conventions', [
      ['boundaries', ['punctuation']],
      ['form_structure_and_sense', ['grammar', 'form_structure_sense']]
    ], []]
  ]
};

function normalizeKey(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function matches(value, candidates) {
  const target = normalizeKey(value);
  return candidates.some((candidate) => normalizeKey(candidate) === target);
}

export function normalizeQuestionHubClassification(subject, domain, skill) {
  const domains = QUESTION_HUB_CATALOG[subject] || [];
  for (const [domainName, skills] of domains) {
    for (const [skillName, aliases] of skills) {
      if (matches(skill, [skillName, ...aliases])) {
        return { domain: domainName, skill: skillName };
      }
    }
  }

  const domainMatch = domains.find(([domainName, , aliases]) => matches(domain, [domainName, ...aliases])) || domains[0];
  return {
    domain: domainMatch?.[0] || String(domain || '').trim(),
    skill: domainMatch?.[1]?.[0]?.[0] || normalizeKey(skill)
  };
}

export function normalizeQuestionHubDomain(subject, domain, skill) {
  return normalizeQuestionHubClassification(subject, domain, skill).domain;
}

export function normalizeQuestionHubSkill(subject, domain, skill) {
  return normalizeQuestionHubClassification(subject, domain, skill).skill;
}
