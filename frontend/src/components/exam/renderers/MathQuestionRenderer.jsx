import { useState } from 'react';
import TextInputQuestion from '../../question/TextInputQuestion.jsx';
import QuestionOptions from './QuestionOptions.jsx';
import QuestionImage from './QuestionImage.jsx';
import CalculatorModal from './CalculatorModal.jsx';

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
  onToggleEliminated
}) {
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const isTextInput = question.type === 'text_input' || !question.options?.length;

  return (
    <div className="question-body math-question-body">
      <div className="math-tool-row">
        {question.calculatorAllowed ? (
          <button type="button" className="math-tool-button" onClick={() => setCalculatorOpen(true)}>
            Calculator
          </button>
        ) : null}
      </div>
      <h3>{question.questionText}</h3>
      <QuestionImage src={question.imageUrl} alt="Graph or reference image for this math question" />
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
        />
      )}
      <CalculatorModal open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </div>
  );
}
