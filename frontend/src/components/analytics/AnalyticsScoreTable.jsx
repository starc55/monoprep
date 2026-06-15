import { formatDate } from '../../utils/format.js';

function scoreToSatTotal(value) {
  if (!value) return 400;
  return value > 100 ? value : Math.round(400 + (value / 100) * 1200);
}

function scoreToSatSection(value) {
  if (!value) return 200;
  return value > 100 ? value : Math.round(200 + (value / 100) * 600);
}

export default function AnalyticsScoreTable({ items }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Exam</th>
            <th>Total</th>
            <th>RW</th>
            <th>Math</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.attemptId}>
              <td>{formatDate(item.date)}</td>
              <td>{item.examTitle}</td>
              <td>{scoreToSatTotal(item.totalScore)}</td>
              <td>{scoreToSatSection(item.readingWritingScore)}</td>
              <td>{scoreToSatSection(item.mathScore)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
