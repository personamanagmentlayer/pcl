# Electron Expert — Code Examples

Reference material for the `electron-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Basic Electron App Structure

```javascript
// package.json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  }
}

// main.js (Main Process)
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// preload.js (Preload Script)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  }
});

// renderer.js (Renderer Process)
document.addEventListener('DOMContentLoaded', async () => {
  const version = await window.electronAPI.getAppVersion();
  const platform = await window.electronAPI.getPlatform();

  document.getElementById('version').textContent = version;
  document.getElementById('platform').textContent = platform;
});
```

### Advanced IPC Communication

```javascript
// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');

// Handle file operations
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-file', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Handle database operations
ipcMain.handle('db-query', async (event, query, params) => {
  // Your database logic here
  return results;
});

// Send progress updates to renderer
function performLongTask() {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    mainWindow.webContents.send('task-progress', progress);

    if (progress >= 100) {
      clearInterval(interval);
      mainWindow.webContents.send('task-complete', { success: true });
    }
  }, 500);
}

ipcMain.handle('start-long-task', async (event) => {
  performLongTask();
  return { started: true };
});

// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fileAPI', {
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
  selectFile: () => ipcRenderer.invoke('select-file'),
});

contextBridge.exposeInMainWorld('taskAPI', {
  startLongTask: () => ipcRenderer.invoke('start-long-task'),
  onProgress: (callback) => {
    ipcRenderer.on('task-progress', (event, progress) => callback(progress));
  },
  onComplete: (callback) => {
    ipcRenderer.on('task-complete', (event, result) => callback(result));
  },
});

// renderer.js
async function loadFile() {
  const filePath = await window.fileAPI.selectFile();
  if (filePath) {
    const result = await window.fileAPI.readFile(filePath);
    if (result.success) {
      document.getElementById('editor').value = result.content;
    } else {
      console.error('Error reading file:', result.error);
    }
  }
}

async function saveFile(filePath, content) {
  const result = await window.fileAPI.writeFile(filePath, content);
  if (!result.success) {
    console.error('Error writing file:', result.error);
  }
}

// Long running task with progress
window.taskAPI.onProgress((progress) => {
  document.getElementById('progress').style.width = `${progress}%`;
});

window.taskAPI.onComplete((result) => {
  console.log('Task completed:', result);
});

document.getElementById('start-task').addEventListener('click', async () => {
  await window.taskAPI.startLongTask();
});
```

### Native Menus

```javascript
// main.js
const { app, BrowserWindow, Menu } = require('electron');

function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-file');
          },
        },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog({
              properties: ['openFile'],
            });
            if (!result.canceled) {
              mainWindow.webContents.send(
                'menu-open-file',
                result.filePaths[0]
              );
            }
          },
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },

    // View menu
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

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close' }]),
      ],
    },

    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://electronjs.org');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
  createWindow();
});
```

### Auto Updates (electron-updater)

```javascript
// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
}

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
  mainWindow?.webContents.send('update-checking');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info);
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available:', info);
  mainWindow?.webContents.send('update-not-available');
});

autoUpdater.on('error', (err) => {
  log.error('Error in auto-updater:', err);
  mainWindow?.webContents.send('update-error', err.message);
});

autoUpdater.on('download-progress', (progress) => {
  log.info(`Download progress: ${progress.percent}%`);
  mainWindow?.webContents.send('update-download-progress', progress);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info);
  mainWindow?.webContents.send('update-downloaded', info);
});

// IPC handlers
ipcMain.handle('check-for-updates', async () => {
  try {
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('Error checking for updates:', error);
    return null;
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

app.whenReady().then(() => {
  createWindow();

  // Check for updates on startup (production only)
  if (!process.env.NODE_ENV === 'development') {
    setTimeout(() => autoUpdater.checkForUpdates(), 3000);
  }
});

// preload.js
contextBridge.exposeInMainWorld('updater', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateChecking: (callback) => {
    ipcRenderer.on('update-checking', () => callback());
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, progress) =>
      callback(progress)
    );
  },
});
```

### Electron Builder Configuration

```javascript
// electron-builder.json
{
  "appId": "com.example.myapp",
  "productName": "My App",
  "directories": {
    "output": "dist",
    "buildResources": "build"
  },
  "files": [
    "main.js",
    "preload.js",
    "renderer/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      },
      {
        "target": "zip",
        "arch": ["x64", "arm64"]
      }
    ],
    "icon": "build/icon.icns",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64", "ia32"]
      },
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ],
    "icon": "build/icon.ico",
    "publisherName": "Your Company Name",
    "verifyUpdateCodeSignature": false
  },
  "linux": {
    "target": [
      "AppImage",
      "deb",
      "rpm"
    ],
    "category": "Utility",
    "icon": "build/icons"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "My App"
  },
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "your-repo"
  }
}

// package.json scripts
{
  "scripts": {
    "start": "electron .",
    "dev": "NODE_ENV=development electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux",
    "release": "electron-builder --publish always"
  }
}
```
