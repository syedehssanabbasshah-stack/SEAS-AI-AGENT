const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nexaDesk', { call: (p, b) => ipcRenderer.invoke('nexa', p, b), onProgress: () => {} });
contextBridge.exposeInMainWorld('nexaSetup', { save: url => ipcRenderer.invoke('setup-save', url) });
