function formatSkill(skill) {
  return skill ? skill.replaceAll('_', ' ') : 'Skill';
}

export default function SkillProgressList({ skills = [], emptyLabel = 'Skill data appears after scored questions.' }) {
  if (!skills.length) {
    return <p className="pro-empty-copy">{emptyLabel}</p>;
  }

  return (
    <div className="pro-skill-list">
      {skills.map((skill) => {
        const value = Math.max(0, Math.min(100, skill.accuracy || 0));
        return (
          <div key={skill.skill} className="pro-skill-row">
            <div>
              <span>{formatSkill(skill.skill)}</span>
              <b>{value}%</b>
            </div>
            <i><span style={{ width: `${value}%` }} /></i>
          </div>
        );
      })}
    </div>
  );
}
