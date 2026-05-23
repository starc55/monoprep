import Card from '../ui/Card.jsx';

export default function FeedbackSummary({ feedback }) {
  const strengths = feedback.strengths || [];
  const weaknesses = feedback.weaknesses || [];

  return (
    <div className="feedback-grid">
      <Card title="Overall Feedback">
        <p>{feedback.overallFeedback}</p>
      </Card>
      <Card title="Strengths">
        <ul className="clean-list">
          {strengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
      <Card title="Weaknesses">
        <ul className="clean-list">
          {weaknesses.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
      <Card title="Time Management">
        <p>{feedback.timeManagement}</p>
      </Card>
    </div>
  );
}
