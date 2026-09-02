import { formatSeconds } from '../../utils/format.js';
import AnimatedDropdown from '../motion/AnimatedDropdown.jsx';
import {
  Accessibility,
  Calculator,
  CircleHelp,
  CirclePause,
  FileText,
  Keyboard,
  LogOut,
  MoreVertical,
  Rows3,
  Sigma
} from 'lucide-react';

function ToolIcon({ name }) {
  const icons = {
    notes: FileText,
    formula: Sigma,
    calculator: Calculator,
    help: CircleHelp,
    keyboard: Keyboard,
    access: Accessibility,
    line: Rows3,
    break: CirclePause,
    exit: LogOut,
    dots: MoreVertical
  };
  const Icon = icons[name] || MoreVertical;
  return <Icon size={20} strokeWidth={2} aria-hidden="true" />;
}

export default function ExamHeader({
  sectionTitle,
  remainingSeconds,
  timerHidden,
  onToggleTimer,
  moreOpen,
  onToggleMore,
  onShowDirections,
  showCalculatorTool,
  calculatorOpen,
  onOpenCalculator,
  showFormulaTool,
  formulaOpen,
  onOpenFormula,
  notesOpen,
  lineReaderActive,
  onMenuAction
}) {
  const menuItems = [
    ['notes', notesOpen ? 'Close Highlights & Notes' : 'Highlights & Notes', 'notes'],
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
        {showCalculatorTool ? (
          <button
            type="button"
            className={`tool-button icon-tool ${calculatorOpen ? 'active' : ''}`.trim()}
            aria-label="Open Desmos calculator"
            title="Open Desmos calculator"
            aria-pressed={calculatorOpen}
            onClick={onOpenCalculator}
          >
            <ToolIcon name="calculator" />
            <span className="tool-label">Calculator</span>
          </button>
        ) : null}
        {showFormulaTool ? (
          <button
            type="button"
            className={`tool-button icon-tool ${formulaOpen ? 'active' : ''}`.trim()}
            aria-label="Formula reference"
            title="Formula reference"
            aria-pressed={formulaOpen}
            onClick={onOpenFormula}
          >
            <ToolIcon name="formula" />
            <span className="tool-label">Reference</span>
          </button>
        ) : null}
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
            <span className="tool-label">More</span>
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
