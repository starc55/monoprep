import QuestionOptions from './QuestionOptions.jsx';
import TextInputQuestion from '../../question/TextInputQuestion.jsx';
import MathJaxContent from '../../math/MathJaxContent.jsx';

export default function ReadingQuestionRenderer({
  question,
  value,
  onChange,
  eliminatedValues,
  onToggleEliminated
}) {
  const isTextInput = question.type === 'text_input';

  return (
    <div className="question-body reading-question-body">
      <h3><MathJaxContent>{question.questionText}</MathJaxContent></h3>
      {isTextInput ? (
        <TextInputQuestion value={value} onChange={onChange} />
      ) : (
        <QuestionOptions
          question={question}
          value={value}
          onChange={onChange}
          multiple={question.type === 'multi_choice'}
          eliminatedValues={eliminatedValues}
          onToggleEliminated={onToggleEliminated}
        />
      )}
    </div>
  );
}
