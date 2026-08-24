import QuestionOptions from './QuestionOptions.jsx';
import AudioPlayerWithLimit from './AudioPlayerWithLimit.jsx';
import MathJaxContent from '../../math/MathJaxContent.jsx';

export default function ListeningQuestionRenderer({
  question,
  value,
  onChange,
  eliminatedValues,
  onToggleEliminated
}) {
  return (
    <div className="question-body listening-question-body">
      {question.instructions ? <p className="listening-instructions">{question.instructions}</p> : null}
      <AudioPlayerWithLimit
        src={question.audioUrl}
        title={question.audioTitle}
        replayLimit={question.audioReplayLimit}
      />
      <h3><MathJaxContent>{question.questionText}</MathJaxContent></h3>
      <QuestionOptions
        question={question}
        value={value}
        onChange={onChange}
        eliminatedValues={eliminatedValues}
        onToggleEliminated={onToggleEliminated}
      />
    </div>
  );
}
