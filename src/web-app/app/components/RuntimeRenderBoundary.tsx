"use client";

import type { ErrorInfo, ReactNode } from "react";
import React from "react";

type RuntimeRenderBoundaryProps = {
  children: ReactNode;
};

type RuntimeRenderBoundaryState = {
  hasError: boolean;
  message: string;
};

export default class RuntimeRenderBoundary extends React.Component<
  RuntimeRenderBoundaryProps,
  RuntimeRenderBoundaryState
> {
  constructor(props: RuntimeRenderBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): RuntimeRenderBoundaryState {
    return {
      hasError: true,
      message: error.message || "A runtime rendering error occurred.",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Runtime route render error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mobile-app-viewport text-white">
          <main className="mobile-app-frame flex flex-col justify-center">
            <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_54px_rgba(0,0,0,0.24)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-aqua)]">
                Prototype fallback
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-white">
                The route is rendering with a recovery screen
              </h1>
              <p className="mt-3 text-sm leading-6 text-neutral-300">
                A client-side rendering error was caught before the page could blank out.
              </p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Error message</p>
                <p className="mt-2 text-sm text-neutral-200">{this.state.message}</p>
              </div>
            </section>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
