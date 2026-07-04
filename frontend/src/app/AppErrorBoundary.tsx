import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. Without it, any runtime error in a page unmounts the
 * whole React tree and leaves a blank white screen. Here we render a recoverable
 * fallback (themed, dark-mode aware) with a reload action instead.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the error for diagnostics.
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
              <span className="text-2xl" aria-hidden>
                !
              </span>
            </div>
            <h1 className="mb-2 text-lg font-semibold">Что-то пошло не так</h1>
            <p className="mb-5 text-sm text-foreground-muted">
              Произошла ошибка при отображении страницы. Попробуйте вернуться на
              главную.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              На главную
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
