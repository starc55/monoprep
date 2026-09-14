const bursts = [
  { x: "18%", y: "28%", delay: "0s" },
  { x: "50%", y: "18%", delay: "0.35s" },
  { x: "82%", y: "30%", delay: "0.7s" },
];

const particles = Array.from({ length: 16 }, (_, index) => {
  const angle = (index / 16) * Math.PI * 2;
  return {
    dx: `${Math.cos(angle) * (105 + (index % 3) * 22)}px`,
    dy: `${Math.sin(angle) * (105 + (index % 3) * 22)}px`,
    delay: `${(index % 4) * 0.035}s`,
  };
});

export default function LaunchFireworks({ active }) {
  if (!active) return null;

  return (
    <div className="launch-celebration" aria-live="polite">
      <div className="launch-celebration-message">
        <img src="/monoprep-logo.png" alt="" />
        <strong>MonoPrep is live</strong>
        <span>Your SAT preparation experience is ready.</span>
      </div>
      {bursts.map((burst, burstIndex) => (
        <div
          className="launch-firework"
          key={`${burst.x}-${burst.y}`}
          style={{ left: burst.x, top: burst.y, animationDelay: burst.delay }}
          aria-hidden="true"
        >
          {particles.map((particle, particleIndex) => (
            <span
              className="launch-firework-particle"
              key={particleIndex}
              style={{
                "--firework-x": particle.dx,
                "--firework-y": particle.dy,
                animationDelay: `calc(${burst.delay} + ${particle.delay})`,
              }}
            >
              <img
                src="/monoprep-logo.png"
                alt=""
                className={burstIndex % 2 === 0 ? "tone-blue" : "tone-white"}
              />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
