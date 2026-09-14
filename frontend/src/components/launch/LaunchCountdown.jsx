import CountdownUnit from "./CountdownUnit.jsx";
import { useCountdown } from "../../hooks/useCountdown.js";

export default function LaunchCountdown({ launchAt }) {
  const remaining = useCountdown(launchAt);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  if (!Number.isFinite(launchAt) || launchAt <= Date.now() || remaining === 0) {
    return <p className="launch-live-state">MonoPrep is Live</p>;
  }

  return (
    <div className="launch-countdown" aria-label="Time remaining until MonoPrep public launch">
      <CountdownUnit value={days} label="Days" />
      <CountdownUnit value={hours} label="Hours" />
      <CountdownUnit value={minutes} label="Minutes" />
      <CountdownUnit value={seconds} label="Seconds" />
    </div>
  );
}

