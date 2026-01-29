import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('api', {
  db: {
    getStats: (selectedFiles?: string[]) => ipcRenderer.invoke('db:stats', selectedFiles),
    importLog: (filePath: string) => ipcRenderer.invoke('db:import', filePath),
    getLogs: (page: number, pageSize: number, filters?: Record<string, unknown>) => ipcRenderer.invoke('db:logs', page, pageSize, filters),
    getFilterOptions: () => ipcRenderer.invoke('db:filterOptions'),
    getImportedFiles: () => ipcRenderer.invoke('db:importedFiles'),
    // Folder operations
    getFolders: () => ipcRenderer.invoke('db:getFolders'),
    createFolder: (name: string) => ipcRenderer.invoke('db:createFolder', name),
    renameFolder: (id: number, name: string) => ipcRenderer.invoke('db:renameFolder', id, name),
    deleteFolder: (id: number) => ipcRenderer.invoke('db:deleteFolder', id),
    assignFileToFolder: (fileSource: string, folderId: number | null) => ipcRenderer.invoke('db:assignFileToFolder', fileSource, folderId),
    deleteFile: (fileSource: string) => ipcRenderer.invoke('db:deleteFile', fileSource),
    exportExcel: (filters?: Record<string, unknown>) => ipcRenderer.invoke('export:excel', filters)
  },
  dialog: {
    selectLogFile: () => ipcRenderer.invoke('dialog:openLog')
  }
})
