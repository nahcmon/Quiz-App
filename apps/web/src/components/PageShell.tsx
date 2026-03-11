import { motion, useReducedMotion } from "framer-motion";
import { NavLink } from "react-router-dom";
import type { PropsWithChildren, ReactNode } from "react";

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

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.75l1.08 2.2 2.43.35-1.75 1.7.41 2.4L12 9.28l-2.17 1.12.41-2.4-1.75-1.7 2.43-.35L12 3.75Z" />
      <path d="M19.4 10.4l1.85 1.6-1.85 1.6.3 2.42-2.4.56-1.24 2.1-2.26-.95-2.26.95-1.24-2.1-2.4-.56.3-2.42L2.75 12l1.85-1.6-.3-2.42 2.4-.56 1.24-2.1 2.26.95 2.26-.95 1.24 2.1 2.4.56-.3 2.42Z" />
      <circle cx="12" cy="12" r="2.9" />
    </svg>
  );
}

export function PageShell({
  children,
  title,
  eyebrow,
  actions,
  className
}: PageShellProps) {
  const reduced = useReducedMotion();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-cloud text-ink">
      <div className="pointer-events-none absolute inset-0 bg-hero-grid" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-mint/30 blur-3xl"
        animate={
          reduced
            ? undefined
            : {
                x: [0, 26, 0],
                y: [0, 18, 0]
              }
        }
        transition={
          reduced
            ? undefined
            : {
                duration: 10,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut"
              }
        }
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-ember/20 blur-3xl"
        animate={
          reduced
            ? undefined
            : {
                x: [0, -22, 0],
                y: [0, 24, 0]
              }
        }
        transition={
          reduced
            ? undefined
            : {
                duration: 12,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut"
              }
        }
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-[2rem] border border-white/50 bg-white/60 px-4 py-4 shadow-panel backdrop-blur">
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
              <span className="sm:hidden">
                <SettingsIcon />
              </span>
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
