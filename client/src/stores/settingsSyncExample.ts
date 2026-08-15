/**
 * EXAMPLE — not meant to be dropped in as-is.
 *
 * Shows how to connect useSettingsSync to a Zustand settings store like
 * Bindery's. Adjust field names (`theme`, `pageSize`, etc.) to match your
 * real store shape.
 */

import { create } from "zustand";
import { useSettingsSync } from "@/lib/useSettingsSync";

// --- Your existing settings store (illustrative shape) -------------------
type AppSettings = {
  theme: "dark" | "light";
  pageSize: "a4" | "letter";
  autoRotate: boolean;
};

type SettingsState = {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  replaceSettings: (settings: AppSettings) => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { theme: "dark", pageSize: "a4", autoRotate: true },

  // Called by UI controls in SettingsDialog
  updateSetting: (key, value) => {
    set((state) => ({ settings: { ...state.settings, [key]: value } }));
    // Push to Mongo after the change — see hookIntoSync() below
    syncBridge?.pushSettings(get().settings);
  },

  // Called when settings arrive from Mongo after login
  replaceSettings: (settings) => set({ settings }),
}));

// --- Bridge between the Zustand store and the sync hook -------------------
// The hook has to be called inside a React component (it uses useEffect),
// so we stash a reference to `pushSettings` here for the plain-JS store
// action above to call. Call `useSyncBridge()` once near your app root.
let syncBridge: { pushSettings: (s: AppSettings) => void } | null = null;

export function useSyncBridge() {
  const { settings, replaceSettings } = useSettingsStore();

  const { pushSettings } = useSettingsSync<AppSettings>({
    getLocalSettings: () => settings,
    applyRemoteSettings: replaceSettings,
  });

  syncBridge = { pushSettings };
}

// --- Usage in your App root ------------------------------------------------
// function App() {
//   useSyncBridge(); // mount once, alongside <HeaderAuthControl />
//   return ( ... );
// }
