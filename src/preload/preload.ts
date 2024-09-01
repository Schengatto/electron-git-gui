import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  initGit: (dir: string) => ipcRenderer.invoke('git:init', dir),
  fetchAndGetBranches: () => ipcRenderer.invoke('git:fetchAndGetBranches'),
  switchBranch: (branchName: string) => ipcRenderer.invoke('git:switchBranch', branchName),
  getStatus: () => ipcRenderer.invoke('git:getStatus'),
  stageFile: (file: string) => ipcRenderer.invoke('git:stageFile', file),
  unstageFile: (file: string) => ipcRenderer.invoke('git:unstageFile', file),
  stageAllFiles: () => ipcRenderer.invoke('git:stageAllFiles'),
  unstageAllFiles: () => ipcRenderer.invoke('git:unstageAllFiles'),
  commit: (message: string) => ipcRenderer.invoke('git:commit', message),
  push: (force: boolean) => ipcRenderer.invoke('git:push', force)
});