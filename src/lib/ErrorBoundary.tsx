import React from 'react';

/**
 * Catches a render error below it, so one broken part of a page can't blank
 * the whole thing. React still needs a class component for this.
 *
 * `fallback` is what shows instead (`null` to show nothing). `resetKey`:
 * when it changes (say, the route), the boundary clears and tries again.
 */
interface Props {
  /** Names the part in the console message, e.g. "Hero" or "admin page". */
  name: string;
  fallback: React.ReactNode | ((reset: () => void) => React.ReactNode);
  resetKey?: unknown;
  children: React.ReactNode;
}

interface State {
  failed: boolean;
  /** The resetKey this state belongs to; a different one means "start over". */
  key: unknown;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { failed: false, key: props.resetKey };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null;
  }

  componentDidCatch(error: unknown): void {
    console.error(
      `[ui] ${this.props.name} failed to render:`,
      error instanceof Error ? error.message : error
    );
  }

  private reset = () => this.setState({ failed: false });

  render(): React.ReactNode {
    if (!this.state.failed) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === 'function' ? fallback(this.reset) : fallback;
  }
}
