import { app, BrowserWindow, ipcMain, session, Menu, MenuItemConstructorOptions, Cookie, IpcMainInvokeEvent, IpcMainEvent, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

let mainWindow: BrowserWindow | null = null;

const RIONA_API_URL = process.env.RIONA_API_URL || 'http://localhost:3001';
const RAMME_IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Riona Social Media AI Agent — Desktop Client (Ramme Integrated)',
    backgroundColor: '#0f172a',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
  });

  const indexPath = path.join(__dirname, 'index.html');
  const srcIndexPath = path.join(__dirname, '..', 'src', 'index.html');
  const targetHtml = fs.existsSync(indexPath) ? indexPath : srcIndexPath;

  mainWindow.loadFile(targetHtml);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupInstagramSessionInterceptor();
  setupMenu();
}

function setupInstagramSessionInterceptor(): void {
  const igSession = session.fromPartition('persist:instagram');
  igSession.setUserAgent(RAMME_IPHONE_USER_AGENT);

  igSession.cookies.on('changed', async (_event: any, cookie: Cookie, _cause: string, removed: boolean) => {
    if (removed) return;
    if (cookie.domain && cookie.domain.includes('instagram.com')) {
      if (['sessionid', 'csrftoken', 'ds_user_id'].includes(cookie.name)) {
        await captureAndSyncSession(igSession);
      }
    }
  });
}

async function captureAndSyncSession(igSession: Electron.Session): Promise<void> {
  try {
    const cookies = await igSession.cookies.get({ domain: '.instagram.com' });
    const cookieMap: Record<string, string> = {};
    cookies.forEach((c: Cookie) => {
      cookieMap[c.name] = c.value;
    });

    if (cookieMap.sessionid && cookieMap.ds_user_id) {
      const sessionData = {
        platform: 'instagram',
        username: cookieMap.ds_user_id,
        sessionCookieJson: JSON.stringify(cookies),
        capturedAt: new Date().toISOString(),
      };

      console.log('Captured Instagram Session Cookie:', cookieMap.ds_user_id);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('session-captured', sessionData);
      }
    }
  } catch (err: any) {
    console.error('Failed to capture Instagram session cookies:', err.message);
  }
}

function setupMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: '🌸 Riona Agent',
      submenu: [
        { label: 'Quit Riona Desktop', role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('sync-session-cookies', async (_event: IpcMainInvokeEvent, args: { brandId: string; platform: string; payload: Record<string, any> }) => {
  try {
    const { brandId, platform, payload } = args;
    const res = await axios.post(
      `${RIONA_API_URL}/api/v1/brands/${brandId}/accounts/login-platform`,
      {
        platform,
        username: payload.username,
        sessionCookieJson: payload.sessionCookieJson,
      }
    );
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.response?.data || err.message };
  }
});

ipcMain.handle('get-system-info', () => {
  return {
    platform: process.platform,
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
  };
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
