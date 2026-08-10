const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petWindow", {
  getPosition: () => ipcRenderer.invoke("window:get-position"),
  setPosition: (x, y) => ipcRenderer.invoke("window:set-position", x, y),
  getScreen: () => ipcRenderer.invoke("window:get-screen"),
  setSize: key => ipcRenderer.invoke("window:set-size", key),
  toggleSettings: () => ipcRenderer.invoke("settings:toggle"),
  closeSettings: () => ipcRenderer.invoke("settings:close"),
  playAction: action => ipcRenderer.invoke("pet:play-action", action),
  quit: () => ipcRenderer.invoke("window:quit"),
  onPetSize: callback => ipcRenderer.on("pet:size", (_event, key) => callback(key)),
  onPetAction: callback => ipcRenderer.on("pet:play-action", (_event, action) => callback(action)),
  onSettingsSize: callback => ipcRenderer.on("settings:size", (_event, key) => callback(key))
});