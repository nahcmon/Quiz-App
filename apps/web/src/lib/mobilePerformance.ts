import { useEffect, useState } from "react";

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

function readMobilePerformanceMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const smallViewport = window.matchMedia("(max-width: 767px)").matches;
  return coarsePointer || smallViewport;
}

export function useMobilePerformanceMode() {
  const [mobilePerformanceMode, setMobilePerformanceMode] = useState(() =>
    readMobilePerformanceMode()
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const coarsePointerQuery = window.matchMedia(
      "(pointer: coarse)"
    ) as LegacyMediaQueryList;
    const smallViewportQuery = window.matchMedia(
      "(max-width: 767px)"
    ) as LegacyMediaQueryList;

    const update = () => {
      setMobilePerformanceMode(
        coarsePointerQuery.matches || smallViewportQuery.matches
      );
    };

    update();
    if (typeof coarsePointerQuery.addEventListener === "function") {
      coarsePointerQuery.addEventListener("change", update);
      smallViewportQuery.addEventListener("change", update);
    } else if (
      typeof coarsePointerQuery.addListener === "function" &&
      typeof smallViewportQuery.addListener === "function"
    ) {
      coarsePointerQuery.addListener(update);
      smallViewportQuery.addListener(update);
    }

    return () => {
      if (typeof coarsePointerQuery.removeEventListener === "function") {
        coarsePointerQuery.removeEventListener("change", update);
        smallViewportQuery.removeEventListener("change", update);
      } else if (
        typeof coarsePointerQuery.removeListener === "function" &&
        typeof smallViewportQuery.removeListener === "function"
      ) {
        coarsePointerQuery.removeListener(update);
        smallViewportQuery.removeListener(update);
      }
    };
  }, []);

  return mobilePerformanceMode;
}
