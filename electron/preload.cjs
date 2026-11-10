const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("flame", {
  isElectron: true,
  getScreenAccess: () => ipcRenderer.invoke("screen:access"),
  openScreenSettings: () => ipcRenderer.invoke("screen:open-settings"),
  capturePrimaryScreen: () => ipcRenderer.invoke("screen:capture"),
  getApiKey: () => ipcRenderer.invoke("settings:getApiKey"),
  setApiKey: (key) => ipcRenderer.invoke("settings:setApiKey", key),
  getPlatform: () => ipcRenderer.invoke("app:platform"),
});
