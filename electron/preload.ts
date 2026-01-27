import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('api', {
  db: {
    getStats: () => ipcRenderer.invoke('db:stats'),
    importLog: (filePath: string) => ipcRenderer.invoke('db:import', filePath),
    getLogs: (page: number, pageSize: number) => ipcRenderer.invoke('db:logs', page, pageSize)
  },
  dialog: {
    selectLogFile: () => ipcRenderer.invoke('dialog:openLog')
  }
})
