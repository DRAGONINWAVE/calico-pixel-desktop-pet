const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  getBounds: () => ipcRenderer.invoke('pet:get-bounds'),
  getCursorPoint: () => ipcRenderer.invoke('pet:get-cursor-point'),
  getSystemMetrics: () => ipcRenderer.invoke('system:get-metrics'),
  getWorkArea: (point) => ipcRenderer.invoke('pet:get-work-area', point),
  moveWindow: (position) => ipcRenderer.invoke('pet:move-window', position),
  dropWindow: (position) => ipcRenderer.invoke('pet:drop-window', position),
  showMenu: (point) => ipcRenderer.send('pet:show-menu', point),
  onCommand: (callback) => ipcRenderer.on('pet-command', (_event, command) => callback(command)),
});
