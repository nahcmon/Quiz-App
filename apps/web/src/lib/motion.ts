import { type Variants } from "framer-motion";

export function createRouteVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.18 } },
      exit: { opacity: 0, transition: { duration: 0.14 } }
    };
  }

  return {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.22, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.18, ease: "easeInOut" }
    }
  };
}

export function pageTransitionProps(reduced: boolean) {
  return {
    initial: "initial",
    animate: "animate",
    exit: "exit",
    variants: createRouteVariants(reduced)
  } as const;
}
