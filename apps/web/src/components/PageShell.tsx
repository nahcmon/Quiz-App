import { motion, useReducedMotion } from "framer-motion";
import { NavLink } from "react-router-dom";
import type { PropsWithChildren, ReactNode } from "react";

import { useMobilePerformanceMode } from "../lib/mobilePerformance";

interface PageShellProps extends PropsWithChildren {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

function navigationClassName(active: boolean) {
  return active
    ? "rounded-full bg-white/80 px-4 py-2 text-ink shadow-panel"
    : "rounded-full px-4 py-2 text-dusk/80 transition hover:bg-white/40 hover:text-ink";
}

export function PageShell({
  children,
  title,
  eyebrow,
  actions,
  className
}: PageShellProps) {
  const reduced = useReducedMotion();
  const mobilePerformanceMode = useMobilePerformanceMode();
  const simplifyAmbientMotion = reduced || mobilePerformanceMode;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-cloud text-ink">
      <div className="pointer-events-none absolute inset-0 bg-hero-grid" />
      {!simplifyAmbientMotion ? (
        <>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-mint/30 blur-3xl"
            animate={{
              x: [0, 26, 0],
              y: [0, 18, 0]
            }}
            transition={{
              duration: 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut"
            }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-ember/20 blur-3xl"
            animate={{
              x: [0, -22, 0],
              y: [0, 24, 0]
            }}
            transition={{
              duration: 12,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut"
            }}
          />
        </>
      ) : null}

      <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="glass-surface mb-8 rounded-[2rem] border border-white/50 px-4 py-4 shadow-panel">
          <nav className="flex flex-wrap gap-2 text-sm font-semibold">
            <NavLink to="/" className={({ isActive }) => navigationClassName(isActive)}>
              Start
            </NavLink>
            <NavLink to="/quizzes" className={({ isActive }) => navigationClassName(isActive)}>
              Quizze
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => navigationClassName(isActive)}>
              Verlauf
            </NavLink>
            <NavLink
              to="/settings"
              aria-label="Einstellungen"
              className={({ isActive }) =>
                `${navigationClassName(isActive)} flex items-center justify-center`
              }
            >
              <span className="sm:hidden">Setup</span>
              <span className="hidden sm:inline">Einstellungen</span>
            </NavLink>
          </nav>
        </header>

        <main className={`flex-1 ${className ?? ""}`}>
          <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              {eyebrow ? (
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                {title}
              </h1>
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </section>
          {children}
        </main>
      </div>
    </div>
  );
}
