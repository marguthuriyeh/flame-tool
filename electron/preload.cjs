const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("flame", {
  isElectron: true,
  getScreenAccess: () => ipcRenderer.invoke("screen:access"),
  openScreenSettings: () => ipcRenderer.invoke("screen:open-settings"),
  capturePrimaryScreen: () => ipcRenderer.invoke("screen:capture"),
  getGeminiApiKey: () => ipcRenderer.invoke("settings:getGeminiApiKey"),
  setGeminiApiKey: (key) => ipcRenderer.invoke("settings:setGeminiApiKey", key),
  /** @deprecated alias — Gemini key */
  getApiKey: () => ipcRenderer.invoke("settings:getGeminiApiKey"),
  /** @deprecated alias — Gemini key */
  setApiKey: (key) => ipcRenderer.invoke("settings:setGeminiApiKey", key),
  getPlatform: () => ipcRenderer.invoke("app:platform"),
  getAnalyzeShortcut: () => ipcRenderer.invoke("app:analyzeShortcut"),
  onHotkeyAnalyze: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("analyze:hotkey", listener);
    return () => ipcRenderer.removeListener("analyze:hotkey", listener);
  },
});
