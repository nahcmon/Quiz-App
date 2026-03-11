import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  lazy,
  type ReactNode,
  useEffect,
  useState
} from "react";

import { type QuizQuestion } from "@quiz/shared";

import { useMobilePerformanceMode } from "../lib/mobilePerformance";
import {
  useAppReducedMotion
} from "./route-utils";

const DeferredQRCodeSvg = lazy(async () => {
  const module = await import("qrcode.react");
  return { default: module.QRCodeSVG };
});

const DeferredVirtualRoster = lazy(async () => {
  const module = await import("../components/VirtualRoster");
  return { default: module.VirtualRoster };
});

function Button({
  children,
  as = "button",
  href,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button"
}: {
  children: ReactNode;
  as?: "button" | "link";
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean disabled:cursor-not-allowed disabled:opacity-55";
  const variants = {
    primary: "bg-ink text-white shadow-lg shadow-ink/15 hover:bg-dusk",
    secondary: "bg-white/80 text-ink shadow-panel hover:bg-white",
    ghost: "bg-transparent text-dusk hover:bg-white/50"
  } as const;

  if (as === "link" && href) {
    return (
      <Link to={href} className={`${base} ${variants[variant]}`}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

function GlassPanel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass-surface rounded-[2rem] border border-white/60 p-6 shadow-panel ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      {subtitle ? <p className="text-sm text-dusk/75">{subtitle}</p> : null}
    </div>
  );
}

function RosterFallback({
  items,
  emphasisTopThree = false
}: {
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    trailing: string;
  }>;
  emphasisTopThree?: boolean;
}) {
  return (
    <div className="max-h-[28rem] overflow-auto rounded-[1.8rem] border border-white/60 bg-white/92 shadow-panel">
      {items.map((item, index) => {
        const topThree = emphasisTopThree && index < 3;
        return (
          <div
            key={item.id}
            className={`flex items-center justify-between border-b border-slate-100 px-4 py-4 ${
              topThree ? "bg-gradient-to-r from-mint/20 via-white to-sun/20" : "bg-transparent"
            }`}
          >
            <div>
              <p className="font-display text-lg font-bold text-ink">{item.title}</p>
              <p className="text-sm text-dusk/75">{item.subtitle}</p>
            </div>
            <p className="font-display text-xl font-bold text-ocean">{item.trailing}</p>
          </div>
        );
      })}
    </div>
  );
}

function useNow(
  enabled: boolean,
  options?: {
    intervalMs?: number;
    mode?: "interval" | "animationFrame";
  }
) {
  const [now, setNow] = useState(() => Date.now());
  const intervalMs = options?.intervalMs ?? 150;
  const mode = options?.mode ?? "interval";

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (mode === "animationFrame") {
      let frameId = 0;

      const tick = () => {
        setNow(Date.now());
        frameId = window.requestAnimationFrame(tick);
      };

      frameId = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(frameId);
    }

    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, mode]);

  return now;
}


function TimerBar({
  startedAt,
  endsAt
}: {
  startedAt?: number;
  endsAt?: number;
}) {
  const reduced = useAppReducedMotion();
  const mobilePerformanceMode = useMobilePerformanceMode();
  const simplifiedMotion = reduced || mobilePerformanceMode;
  const now = useNow(Boolean(startedAt && endsAt), {
    intervalMs: 200
  });

  if (!startedAt || !endsAt) {
    return null;
  }

  const duration = Math.max(1, endsAt - startedAt);
  const elapsed = Math.max(0, Math.min(duration, now - startedAt));
  const remaining = Math.max(0, endsAt - now);
  const progress = Math.max(0, Math.min(1, remaining / duration));
  const remainingSeconds = Math.ceil(remaining / 1000);
  const urgent = progress <= 0.2;
  const critical = remainingSeconds <= 5;
  const animationDelay = `${-elapsed}ms`;

  return (
    <div className="space-y-2">
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${!simplifiedMotion && urgent ? "timer-urgent-pulse" : ""}`}>
          <div
            className={`timer-bar-fill h-full rounded-full ${
              critical ? "bg-ember" : urgent ? "bg-sun" : "bg-ocean"
            }`}
            style={{
              animationName: "timer-shrink",
              animationDuration: `${duration}ms`,
              animationTimingFunction: "linear",
              animationDelay,
              animationFillMode: "both"
            }}
          />
        </div>
      </div>
      <p
        className={`text-right font-display text-xl font-bold text-ink ${
          !simplifiedMotion && critical ? "timer-text-critical" : ""
        }`}
      >
        {remainingSeconds}s
      </p>
    </div>
  );
}

function CountdownOverlay({ startedAt }: { startedAt?: number }) {
  const reduced = useAppReducedMotion();
  const mobilePerformanceMode = useMobilePerformanceMode();
  const now = useNow(Boolean(startedAt), { intervalMs: 100 });

  if (!startedAt) {
    return null;
  }

  const elapsed = now - startedAt;
  if (elapsed > 3_450) {
    return null;
  }

  const value = elapsed >= 3_000 ? "Los" : String(3 - Math.floor(elapsed / 1000));

  return (
    <div className="glass-overlay pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-ink/15">
      <motion.div
        key={value}
        className="font-display text-8xl font-black text-white drop-shadow-[0_14px_38px_rgba(7,17,31,0.32)]"
        initial={reduced || mobilePerformanceMode ? { opacity: 0 } : { opacity: 0, scale: 1.35 }}
        animate={reduced || mobilePerformanceMode ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: value === "Los" ? 0.45 : 0.7,
          ease: "easeOut"
        }}
      >
        {value}
      </motion.div>
    </div>
  );
}

function QuestionImage({ image }: { image?: QuizQuestion["image"] }) {
  if (!image) {
    return null;
  }

  return (
    <motion.img
      src={image.dataUrl}
      alt={image.alt ?? "Frage"}
      initial={{ opacity: 0, scale: 1.03 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="h-52 w-full rounded-[1.8rem] object-cover sm:h-72"
    />
  );
}

function FinalPodium({
  players
}: {
  players: Array<{ playerName: string; score: number }>;
}) {
  const reduced = useAppReducedMotion();
  const mobilePerformanceMode = useMobilePerformanceMode();
  const topThree = players.slice(0, 3);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {topThree.map((player, index) => {
        const isWinner = index === 0;
        return (
          <motion.div
            key={player.playerName}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.34 }}
            className={`rounded-[2rem] border border-white/70 bg-white/85 p-6 text-center shadow-panel ${
              isWinner ? "md:-order-none" : ""
            }`}
          >
            <motion.div
              className={`rounded-[1.5rem] p-6 ${
                isWinner
                  ? "bg-gradient-to-br from-sun/40 to-ember/30"
                  : "bg-slate-50"
              }`}
              animate={
                reduced || mobilePerformanceMode || !isWinner
                  ? undefined
                  : {
                      boxShadow: [
                        "0 0 0 rgba(255, 213, 79, 0.1)",
                        "0 0 30px rgba(255, 213, 79, 0.32)",
                        "0 0 0 rgba(255, 213, 79, 0.1)"
                      ]
                    }
              }
              transition={
                reduced || mobilePerformanceMode || !isWinner
                  ? undefined
                  : {
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY
                    }
              }
            >
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-dusk/60">
                #{index + 1}
              </p>
              <h3 className="font-display text-2xl font-bold text-ink">
                {player.playerName}
              </h3>
              <p className="mt-3 font-display text-3xl font-black text-ocean">
                {player.score}
              </p>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}


export {
  DeferredQRCodeSvg,
  DeferredVirtualRoster,
  Button,
  CountdownOverlay,
  FinalPodium,
  GlassPanel,
  QuestionImage,
  RosterFallback,
  SectionHeading,
  TimerBar
};
