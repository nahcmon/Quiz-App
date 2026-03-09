import { create } from "zustand";

import type { Settings } from "@quiz/shared";

import { loadSettings, saveSettings } from "../lib/localStore";

interface SettingsState {
  settings: Settings;
  initialized: boolean;
  hydrate: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
    motion: "system",
    soundEnabled: true,
    theme: "light",
    hostDensity: "comfortable",
    autoAdvanceAfterReveal: false,
    lastJoinName: ""
  },
  initialized: false,
  hydrate: () => {
    if (get().initialized) {
      return;
    }
    set({
      initialized: true,
      settings: loadSettings()
    });
  },
  updateSettings: (patch) =>
    set((state) => {
      const settings = {
        ...state.settings,
        ...patch
      };
      saveSettings(settings);
      return { settings };
    })
}));
