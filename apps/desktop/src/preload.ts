import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('rionaDesktop', {
  syncSessionCookies: (brandId: string, platform: string, payload: Record<string, any>) =>
    ipcRenderer.invoke('sync-session-cookies', { brandId, platform, payload }),
  onSessionCaptured: (callback: (data: Record<string, any>) => void) => {
    ipcRenderer.on('session-captured', (_event: IpcRendererEvent, data: Record<string, any>) => callback(data));
  },
  switchTab: (tabName: 'riona' | 'instagram') =>
    ipcRenderer.send('switch-tab', tabName),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
});
