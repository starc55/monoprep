import Card from '../ui/Card.jsx';

export default function StudyRoadmap({ roadmap = [] }) {
  return (
    <div className="roadmap-grid">
      {roadmap.map((week, index) => {
        const title = typeof week === 'string' ? `Step ${index + 1}` : `Week ${week.week || index + 1}`;
        const tasks = typeof week === 'string' ? [week] : week.tasks || [];
        return (
          <Card key={`${title}-${index}`} title={title} eyebrow={typeof week === 'string' ? 'Roadmap' : week.focus}>
            <ul className="clean-list">
              {tasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
