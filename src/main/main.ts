import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

let mainWindow: BrowserWindow | null = null;
let git: SimpleGit;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    autoHideMenuBar: true, // This line hides the menu bar
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('dialog:openDirectory', async () => {
    if (!mainWindow) return;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (!canceled) {
      return filePaths[0];
    }
  });

  ipcMain.handle('git:init', async (_: any, dir: string) => {
    try {
      git = simpleGit(dir);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new Error('Not a Git repository');
      }
      return true;
    } catch (error) {
      console.error('Git init error:', error);
      return false;
    }
  });

  ipcMain.handle('git:fetchAndGetBranches', async () => {
    try {
      await git.fetch(['--all']);
      const localBranches = await git.branchLocal();
      const remoteBranches = await git.branch(['--remotes']);
      return {
        local: localBranches.all,
        remote: remoteBranches.all,
        current: localBranches.current
      };
    } catch (error) {
      console.error('Git fetch and branches error:', error);
      return { local: [], remote: [], current: null };
    }
  });

  ipcMain.handle('git:switchBranch', async (_: any, branchName: string) => {
    try {
      if (branchName.startsWith('remotes/')) {
        const localBranchName = branchName.split('/').slice(2).join('/');
        await git.checkout(['-b', localBranchName, branchName]);
      } else {
        await git.checkout(branchName);
      }
      return true;
    } catch (error) {
      console.error('Git switch branch error:', error);
      return false;
    }
  });

  ipcMain.handle('git:getStatus', async () => {
    try {
      const status = await git.status();
      return {
        staged: status.staged,
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
        renamed: status.renamed,
        conflicted: status.conflicted
      };
    } catch (error) {
      console.error('Git status error:', error);
      return null;
    }
  });

  ipcMain.handle('git:stageFile', async (_: any, file: string) => {
    try {
      await git.add(file);
      return true;
    } catch (error) {
      console.error('Git stage file error:', error);
      return false;
    }
  });

  ipcMain.handle('git:unstageFile', async (_: any, file: string) => {
    try {
      await git.reset(['HEAD', file]);
      return true;
    } catch (error) {
      console.error('Git unstage file error:', error);
      return false;
    }
  });

  ipcMain.handle('git:stageAllFiles', async () => {
    try {
      await git.add('.');
      return true;
    } catch (error) {
      console.error('Git stage all files error:', error);
      return false;
    }
  });

  ipcMain.handle('git:unstageAllFiles', async () => {
    try {
      await git.reset(['HEAD']);
      return true;
    } catch (error) {
      console.error('Git unstage all files error:', error);
      return false;
    }
  });

  ipcMain.handle('git:commit', async (_: any, message: string) => {
    try {
      await git.commit(message);
      return true;
    } catch (error) {
      console.error('Git commit error:', error);
      return false;
    }
  });

  ipcMain.handle('git:push', async (_: any, force: boolean) => {
    try {
      if (force) {
        await git.push(['-f']);
      } else {
        await git.push();
      }
      return true;
    } catch (error) {
      console.error('Git push error:', error);
      return false;
    }
  });

  ipcMain.handle('git:hasCommitsToPush', async () => {
    try {
      const status = await git.status();
      return status.ahead > 0;
    } catch (error) {
      console.error('Error checking for commits to push:', error);
      return false;
    }
  });

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