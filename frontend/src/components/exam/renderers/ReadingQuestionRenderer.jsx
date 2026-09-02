import QuestionOptions from './QuestionOptions.jsx';
import TextInputQuestion from '../../question/TextInputQuestion.jsx';
import MathJaxContent from '../../math/MathJaxContent.jsx';
import QuestionImage from './QuestionImage.jsx';

export default function ReadingQuestionRenderer({
  question,
  value,
  onChange,
  eliminatedValues,
  onToggleEliminated,
  eliminateMode
}) {
  const isTextInput = question.type === 'text_input';
  const imageAbove = question.imagePlacement !== 'BELOW';

  return (
    <div className="question-body reading-question-body">
      {imageAbove ? <QuestionImage src={question.imageUrl} alt="Question illustration" /> : null}
      <div className="question-prompt"><MathJaxContent block>{question.questionText}</MathJaxContent></div>
      {!imageAbove ? <QuestionImage src={question.imageUrl} alt="Question illustration" /> : null}
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
          eliminateMode={eliminateMode}
        />
      )}
    </div>
  );
}
