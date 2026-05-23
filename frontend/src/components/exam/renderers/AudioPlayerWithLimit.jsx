import { useEffect, useRef, useState } from 'react';
import { resolveAssetUrl } from '../../../utils/assets.js';

function formatSeconds(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = String(safeSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export default function AudioPlayerWithLimit({ src, title, replayLimit }) {
  const audioRef = useRef(null);
  const [completedPlays, setCompletedPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setCompletedPlays(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setMessage('');
  }, [src, replayLimit]);

  if (!src) {
    return <p className="audio-unavailable">Audio source is not available for this item.</p>;
  }

  const hasLimit = replayLimit !== null && replayLimit !== undefined;
  const remainingReplays = hasLimit
    ? Math.max(Number(replayLimit) - Math.max(completedPlays - 1, 0), 0)
    : null;
  const finished = duration > 0 && currentTime >= duration;

  async function handlePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    setMessage('');

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    if (finished) {
      if (hasLimit && completedPlays > Number(replayLimit)) {
        setMessage('Replay limit reached.');
        return;
      }
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    await audio.play().catch(() => setMessage('Audio could not be played.'));
  }

  return (
    <section className="limited-audio-player" aria-label="Listening audio">
      <div className="audio-title-row">
        <strong>{title || 'Listening recording'}</strong>
        <span>{hasLimit ? `${remainingReplays} replay${remainingReplays === 1 ? '' : 's'} remaining` : 'Unlimited replays'}</span>
      </div>
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCompletedPlays((count) => count + 1);
        }}
      >
        <source src={resolveAssetUrl(src)} />
      </audio>
      <div className="audio-control-row">
        <button type="button" onClick={handlePlayback}>
          {playing ? 'Pause' : completedPlays > 0 ? 'Replay audio' : 'Play audio'}
        </button>
        <div className="audio-progress" aria-label="Audio progress">
          <span style={{ width: `${duration ? Math.min((currentTime / duration) * 100, 100) : 0}%` }} />
        </div>
        <span>{formatSeconds(currentTime)} / {formatSeconds(duration)}</span>
      </div>
      {message ? <p className="audio-limit-message">{message}</p> : null}
    </section>
  );
}
