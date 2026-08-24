import AnimatedCard from "../motion/AnimatedCard.jsx";

export default function Card({
  title,
  eyebrow,
  children,
  className = "",
  ...props
}) {
  return (
    <AnimatedCard className={`card ${className}`.trim()} {...props}>
      {eyebrow ? <span className="card-eyebrow">{eyebrow}</span> : null}
      {title ? <h3 className="card-title">{title}</h3> : null}
      {children}
    </AnimatedCard>
  );
}
