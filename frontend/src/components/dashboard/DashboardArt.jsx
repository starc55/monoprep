export default function DashboardArt({ src, alt = '', className = '' }) {
  return (
    <span className={`dashboard-png-art ${className}`.trim()} aria-hidden={!alt}>
      {src ? <img src={src} alt={alt} loading="lazy" decoding="async" /> : null}
    </span>
  );
}
