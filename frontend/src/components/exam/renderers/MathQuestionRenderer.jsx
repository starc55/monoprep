import TextInputQuestion from '../../question/TextInputQuestion.jsx';
import QuestionOptions from './QuestionOptions.jsx';
import QuestionImage from './QuestionImage.jsx';
import MathJaxContent from '../../math/MathJaxContent.jsx';

function DataTable({ data }) {
  if (!data?.headers?.length || !Array.isArray(data.rows)) {
    return null;
  }

  return (
    <div className="question-data-table-wrap">
      <table className="question-data-table">
        <thead>
          <tr>{data.headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <tr key={`${index}-${row.join('-')}`}>
              {row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MathQuestionRenderer({
  question,
  value,
  onChange,
  eliminatedValues,
  onToggleEliminated,
  eliminateMode
}) {
  const isTextInput = question.type === 'text_input' || !question.options?.length;
  const imageAbove = question.imagePlacement !== 'BELOW';

  return (
    <div className="question-body math-question-body">
      {imageAbove ? <QuestionImage src={question.imageUrl} alt="Graph or reference image for this math question" /> : null}
      <div className="question-prompt"><MathJaxContent block>{question.questionText}</MathJaxContent></div>
      {!imageAbove ? <QuestionImage src={question.imageUrl} alt="Graph or reference image for this math question" /> : null}
      <DataTable data={question.tableData} />
      {isTextInput ? (
        <TextInputQuestion value={value} onChange={onChange} placeholder="Enter your numeric answer" />
      ) : (
        <QuestionOptions
          question={question}
          value={value}
          onChange={onChange}
          eliminatedValues={eliminatedValues}
          onToggleEliminated={onToggleEliminated}
          eliminateMode={eliminateMode}
        />
      )}
    </div>
  );
}
