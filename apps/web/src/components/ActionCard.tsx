import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ActionCardProps {
  title: string;
  description: string;
  accent: string;
  icon: ReactNode;
  onClick?: () => void;
}

export function ActionCard({
  title,
  description,
  accent,
  icon,
  onClick
}: ActionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/75 p-6 text-left shadow-panel backdrop-blur"
      whileHover={{ scale: 1.02, y: -3, transition: { duration: 0.14 } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.09 } }}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`}
      />
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-2xl text-white">
        {icon}
      </div>
      <h2 className="mb-2 font-display text-2xl font-bold text-ink">{title}</h2>
      <p className="text-sm leading-6 text-dusk/80">{description}</p>
    </motion.button>
  );
}
