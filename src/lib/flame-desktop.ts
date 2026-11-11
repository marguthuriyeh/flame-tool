export type ScreenAccessStatus =
  | "granted"
  | "denied"
  | "restricted"
  | "not-determined"
  | "unknown";

export type HotkeyCapturePayload =
  | {
      ok: true;
      status: ScreenAccessStatus;
      mime: string;
      width: number;
      height: number;
      base64: string;
    }
  | {
      ok: false;
      code: string;
      status: ScreenAccessStatus;
      message: string;
    };

export type FlameDesktop = {
  isElectron: true;
  getScreenAccess: () => Promise<{ status: ScreenAccessStatus; platform: string }>;
  openScreenSettings: () => Promise<boolean>;
  capturePrimaryScreen: () => Promise<HotkeyCapturePayload>;
  getGeminiApiKey: () => Promise<string>;
  setGeminiApiKey: (key: string) => Promise<{ saved: boolean; configured: boolean }>;
  getApiKey: () => Promise<string>;
  setApiKey: (key: string) => Promise<{ saved: boolean; configured: boolean }>;
  getPlatform: () => Promise<string>;
  getAnalyzeShortcut: () => Promise<string>;
  onHotkeyAnalyze: (callback: (payload: HotkeyCapturePayload) => void) => () => void;
};

declare global {
  interface Window {
    flame?: FlameDesktop;
  }
}

export function getFlameDesktop(): FlameDesktop | null {
  if (typeof window === "undefined") return null;
  return window.flame ?? null;
}

export function isElectronApp(): boolean {
  return Boolean(getFlameDesktop()?.isElectron);
}
