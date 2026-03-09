import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";

interface VirtualRosterRow {
  id: string;
  title: string;
  subtitle: string;
  trailing: string;
}

interface VirtualRosterProps {
  items: VirtualRosterRow[];
  emphasisTopThree?: boolean;
}

export function VirtualRoster({
  items,
  emphasisTopThree = false
}: VirtualRosterProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    estimateSize: () => 74,
    getScrollElement: () => parentRef.current,
    overscan: 8
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const rankedItems = useMemo(() => items, [items]);

  return (
    <div
      ref={parentRef}
      className="max-h-[28rem] overflow-auto rounded-[1.8rem] border border-white/60 bg-white/80 shadow-panel"
    >
      <div
        className="relative"
        style={{
          height: `${totalSize}px`
        }}
      >
        {virtualRows.map((virtualRow) => {
          const item = rankedItems[virtualRow.index];
          if (!item) {
            return null;
          }
          const topThree = emphasisTopThree && virtualRow.index < 3;

          return (
            <motion.div
              key={virtualRow.key}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{
                duration: 0.22,
                delay: Math.min(virtualRow.index, 7) * 0.06,
                layout: {
                  type: "spring",
                  stiffness: 220,
                  damping: 24
                }
              }}
              className={`absolute left-0 top-0 flex w-full items-center justify-between border-b border-slate-100 px-4 py-4 ${
                topThree ? "bg-gradient-to-r from-mint/20 via-white to-sun/20" : "bg-transparent"
              }`}
              style={{
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <div>
                <p className="font-display text-lg font-bold text-ink">{item.title}</p>
                <p className="text-sm text-dusk/75">{item.subtitle}</p>
              </div>
              <p className="font-display text-xl font-bold text-ocean">{item.trailing}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
