import { useMemo, useRef } from "react";

import { JOIN_CODE_LENGTH, normalizeJoinCode } from "@quiz/shared";

interface SegmentedCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  status: "idle" | "valid" | "invalid";
}

export function SegmentedCodeInput({
  value,
  onChange,
  status
}: SegmentedCodeInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chars = useMemo(
    () => Array.from({ length: JOIN_CODE_LENGTH }, (_, index) => value[index] ?? ""),
    [value]
  );

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="w-full"
        onClick={() => inputRef.current?.focus()}
      >
        <div
          className={`segmented-code-grid grid grid-cols-6 gap-3 ${
            status === "invalid" ? "segmented-code-shake" : ""
          }`}
        >
          {chars.map((character, index) => (
            <div
              key={index}
              className="flex h-16 items-center justify-center rounded-2xl border border-ocean/15 bg-white/90 text-2xl font-bold uppercase shadow-sm"
            >
              {character ? (
                <span
                  key={`${index}-${character}`}
                  className="segmented-code-char segmented-code-char-pop"
                >
                  {character}
                </span>
              ) : (
                <span aria-hidden="true" className="segmented-code-char opacity-0">
                  0
                </span>
              )}
            </div>
          ))}
        </div>
      </button>

      <input
        ref={inputRef}
        value={value}
        maxLength={JOIN_CODE_LENGTH}
        autoCapitalize="characters"
        spellCheck={false}
        onChange={(event) => onChange(normalizeJoinCode(event.target.value))}
        aria-label="Sitzungscode"
        className="sr-only"
      />

      <div className="flex min-h-6 items-center justify-center text-sm font-semibold">
        {status === "valid" ? (
          <span
            key={`valid-${value}`}
            className="segmented-code-status-pop inline-flex items-center gap-2 text-ocean"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-mint text-xs text-ink">
              ✓
            </span>
            Sitzung gefunden
          </span>
        ) : status === "invalid" ? (
          <span key={`invalid-${value}`} className="segmented-code-status-fade text-ember">
            Dieser Code ist aktuell nicht verfügbar.
          </span>
        ) : null}
      </div>
    </div>
  );
}
