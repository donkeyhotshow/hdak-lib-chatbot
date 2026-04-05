"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onRetry?: () => void;
};

type State = {
  hasError: boolean;
};

/**
 * Error boundary scoped to catalog search results.
 * Shows a friendly Ukrainian-language fallback with a retry action.
 */
export class CatalogErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[CatalogErrorBoundary]", error.message);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="hdak-error-fallback">
          <span>Пошук тимчасово недоступний 🛠️</span>
          <button
            className="hdak-retry-btn"
            onClick={this.handleRetry}
            type="button"
          >
            Повторити
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
