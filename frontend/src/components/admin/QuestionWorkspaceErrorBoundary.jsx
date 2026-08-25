import { Component } from 'react';
import Button from '../ui/Button.jsx';

export default class QuestionWorkspaceErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Question editor failed to render.', error);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="builder-empty question-editor-recovery" role="alert">
        <h3>Question editor could not open</h3>
        <p>The form was safely stopped before any exam data changed. Reopen a clean editor and continue.</p>
        <Button onClick={() => this.setState({ failed: false })}>Reopen editor</Button>
      </div>
    );
  }
}
