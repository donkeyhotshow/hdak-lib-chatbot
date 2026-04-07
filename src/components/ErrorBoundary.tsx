"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Called when user clicks "Try again" — use to reload data */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <p className="text-[15px] text-[#2A2520] mb-2">
                Щось пішло не так
              </p>
              <p className="text-[13px] text-[#7A756F] mb-4">
                Спробуйте перезавантажити сторінку.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 text-[12px] rounded-lg border border-[#B87830]/30 text-[#B87830] hover:bg-[#B87830]/5 transition-colors"
                >
                  Спробувати знову
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 text-[12px] rounded-lg bg-[#B87830] text-white hover:bg-[#D4A853] transition-colors"
                >
                  Перезавантажити
                </button>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
