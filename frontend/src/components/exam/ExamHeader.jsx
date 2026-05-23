import { formatSeconds } from '../../utils/format.js';
import AnimatedDropdown from '../motion/AnimatedDropdown.jsx';

function ToolIcon({ name }) {
  const commonProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };

  if (name === 'notes') {
    return (
      <svg {...commonProps}>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 12h6" />
        <path d="M10 16h4" />
      </svg>
    );
  }

  if (name === 'help') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.3 2.3 0 0 1 4.3 1.2c0 1.8-2.1 2-2.1 3.5" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  if (name === 'keyboard') {
    return (
      <svg {...commonProps}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M7 10h.01M11 10h.01M15 10h.01M19 10h.01M7 14h.01M11 14h6" />
      </svg>
    );
  }

  if (name === 'access') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="4.5" r="1.5" />
        <path d="M5 9h14" />
        <path d="M12 9v5" />
        <path d="M8 21l4-7 4 7" />
      </svg>
    );
  }

  if (name === 'line') {
    return (
      <svg {...commonProps}>
        <path d="M4 7h16" />
        <path d="M7 12h10" />
        <path d="M4 17h16" />
      </svg>
    );
  }

  if (name === 'break') {
    return (
      <svg {...commonProps}>
        <path d="M8 7v10" />
        <path d="M16 7v10" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }

  if (name === 'exit') {
    return (
      <svg {...commonProps}>
        <path d="M10 7V5h9v14h-9v-2" />
        <path d="M15 12H4" />
        <path d="M7 9l-3 3 3 3" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ExamHeader({
  sectionTitle,
  remainingSeconds,
  timerHidden,
  onToggleTimer,
  moreOpen,
  onToggleMore,
  onShowDirections,
  onOpenNotes,
  notesOpen,
  lineReaderActive,
  onMenuAction
}) {
  const menuItems = [
    ['help', 'Help', 'help'],
    ['shortcuts', 'Shortcuts', 'keyboard'],
    ['assistive', 'Assistive Technology', 'access'],
    ['line-reader', lineReaderActive ? 'Turn Off Line Reader' : 'Line Reader', 'line'],
    ['break', 'Unscheduled Break', 'break'],
    ['exit', 'Exit the Exam', 'exit']
  ];

  return (
    <header className="bluebook-header">
      <div className="bluebook-header-left">
        <h1>{sectionTitle}</h1>
        <button type="button" className="directions-button" onClick={onShowDirections}>
          Directions <span aria-hidden="true">v</span>
        </button>
      </div>

      <div className="bluebook-timer">
        <strong>{timerHidden ? '--:--' : formatSeconds(remainingSeconds)}</strong>
        <button type="button" onClick={onToggleTimer}>
          {timerHidden ? 'Show' : 'Hide'}
        </button>
      </div>

      <div className="bluebook-tools">
        <button
          type="button"
          className={`tool-button icon-tool ${notesOpen ? 'active' : ''}`.trim()}
          aria-label="Highlights and notes"
          title="Highlights and notes"
          aria-pressed={notesOpen}
          onClick={onOpenNotes}
        >
          <ToolIcon name="notes" />
        </button>
        <div className="more-wrap">
          <button
            type="button"
            className="more-button icon-tool"
            aria-label="More exam tools"
            title="More exam tools"
            aria-expanded={moreOpen}
            onClick={onToggleMore}
          >
            <ToolIcon name="dots" />
          </button>
          <AnimatedDropdown open={moreOpen} className="more-menu">
            {menuItems.map(([action, label, icon]) => (
              <button key={action} type="button" onClick={() => onMenuAction(action)}>
                <span className="more-menu-icon">
                  <ToolIcon name={icon} />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </AnimatedDropdown>
        </div>
      </div>
    </header>
  );
}
