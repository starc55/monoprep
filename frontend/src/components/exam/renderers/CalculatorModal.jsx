import { useState } from 'react';
import Button from '../../ui/Button.jsx';
import Modal from '../../ui/Modal.jsx';

const BUTTONS = [
  ['C', '(', ')', '%'],
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['sqrt', '0', '.', '+']
];

function calculateExpression(expression) {
  let index = 0;

  function parseExpression() {
    let value = parseTerm();
    while (expression[index] === '+' || expression[index] === '-') {
      const operator = expression[index++];
      const nextValue = parseTerm();
      value = operator === '+' ? value + nextValue : value - nextValue;
    }
    return value;
  }

  function parseTerm() {
    let value = parseFactor();
    while (expression[index] === '*' || expression[index] === '/') {
      const operator = expression[index++];
      const nextValue = parseFactor();
      value = operator === '*' ? value * nextValue : value / nextValue;
    }
    return value;
  }

  function parseFactor() {
    let value;
    if (expression.startsWith('sqrt(', index)) {
      index += 5;
      value = Math.sqrt(parseExpression());
      if (expression[index++] !== ')') throw new Error('Missing parenthesis');
    } else if (expression[index] === '(') {
      index += 1;
      value = parseExpression();
      if (expression[index++] !== ')') throw new Error('Missing parenthesis');
    } else if (expression[index] === '-') {
      index += 1;
      value = -parseFactor();
    } else {
      const number = expression.slice(index).match(/^\d*\.?\d+/)?.[0];
      if (!number) throw new Error('Invalid input');
      index += number.length;
      value = Number(number);
    }
    while (expression[index] === '%') {
      value /= 100;
      index += 1;
    }
    return value;
  }

  const result = parseExpression();
  if (index !== expression.length || !Number.isFinite(result)) {
    throw new Error('Invalid input');
  }
  return String(Number(result.toFixed(10)));
}

export default function CalculatorModal({ open, onClose }) {
  const [expression, setExpression] = useState('');
  const [error, setError] = useState('');

  function append(value) {
    setError('');
    setExpression((current) => `${current}${value === 'sqrt' ? 'sqrt(' : value}`);
  }

  function calculate() {
    try {
      setExpression(calculateExpression(expression));
      setError('');
    } catch (_error) {
      setError('Check the expression and try again.');
    }
  }

  return (
    <Modal
      open={open}
      title="Built-in Calculator"
      className="calculator-modal"
      onClose={onClose}
      actions={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="calculator-shell">
        <output className="calculator-display">{expression || '0'}</output>
        {error ? <p className="form-error">{error}</p> : null}
        {BUTTONS.map((row) => (
          <div key={row.join('-')} className="calculator-row">
            {row.map((item) => (
              <button
                key={item}
                type="button"
                className={['/', '*', '-', '+'].includes(item) ? 'operator' : ''}
                onClick={() => {
                  if (item === 'C') {
                    setExpression('');
                    setError('');
                  } else {
                    append(item);
                  }
                }}
              >
                {item === 'sqrt' ? 'sqrt' : item}
              </button>
            ))}
          </div>
        ))}
        <button type="button" className="calculator-equals" onClick={calculate}>=</button>
      </div>
    </Modal>
  );
}
