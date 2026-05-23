import { formatSeconds } from '../../utils/format.js';

export default function CountdownTimer({ value }) {
  return <span className="timer-pill">{formatSeconds(value)}</span>;
}
