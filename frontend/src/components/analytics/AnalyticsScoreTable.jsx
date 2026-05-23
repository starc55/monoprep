import { formatDate } from '../../utils/format.js';

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
            <th>Listening</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.attemptId}>
              <td>{formatDate(item.date)}</td>
              <td>{item.examTitle}</td>
              <td>{item.totalScore}%</td>
              <td>{item.readingWritingScore}%</td>
              <td>{item.mathScore}%</td>
              <td>{item.listeningScore}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
