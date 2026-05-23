export default function ExamLayout({ children, className = '' }) {
  return <div className={`exam-shell ${className}`.trim()}>{children}</div>;
}
