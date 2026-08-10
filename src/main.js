const { app, BrowserWindow, ipcMain, screen } = require("electron");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const logPath = path.join(rootDir, "debug.log");

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, line, "utf8");
  } catch {
    // Logging is optional.
  }
  console.log(message);
}

const sizes = {
  small: { width: 220, height: 280 },
  normal: { width: 300, height: 390 },
  large: { width: 390, height: 500 }
};

let petWin;
let settingsWin;
let currentSize = "normal";

process.on("uncaughtException", error => log(`uncaughtException: ${error.stack || error.message}`));
process.on("unhandledRejection", error => log(`unhandledRejection: ${error && (error.stack || error.message || error)}`));

function initialBounds(width, height) {
  const area = screen.getPrimaryDisplay().workArea;
  return {
    x: Math.round(area.x + area.width - width - 80),
    y: Math.round(area.y + area.height - height - 60),
    width,
    height
  };
}

function keepBottomLeftResize(win, width, height) {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getBounds();
  win.setBounds({
    x: bounds.x,
    y: bounds.y + bounds.height - height,
    width,
    height
  }, false);
}

function positionSettingsWindow() {
  if (!petWin || petWin.isDestroyed() || !settingsWin || settingsWin.isDestroyed()) return;
  const pet = petWin.getBounds();
  const area = screen.getDisplayMatching(pet).workArea;
  const settings = settingsWin.getBounds();
  const gap = 10;
  let x = pet.x + pet.width + gap;
  if (x + settings.width > area.x + area.width - 8) x = pet.x - settings.width - gap;
  if (x < area.x + 8) x = area.x + 8;
  const y = Math.max(area.y + 8, Math.min(area.y + area.height - settings.height - 8, pet.y + 10));
  settingsWin.setPosition(Math.round(x), Math.round(y), false);
}

function createPetWindow() {
  const initial = sizes[currentSize];
  const bounds = initialBounds(initial.width, initial.height);
  log(`create pet window ${JSON.stringify(bounds)}`);

  petWin = new BrowserWindow({
    ...bounds,
    show: true,
    frame: false,
    title: "Itto Desktop Pet",
    transparent: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  petWin.setAlwaysOnTop(true, "screen-saver");
  petWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWin.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    log(`renderer console[${level}]: ${message} (${sourceId}:${line})`);
  });
  petWin.webContents.on("did-finish-load", () => {
    log("pet did-finish-load");
    petWin.show();
  });
  petWin.webContents.on("did-fail-load", (_event, code, desc) => log(`pet did-fail-load: ${code} ${desc}`));
  petWin.webContents.on("render-process-gone", (_event, details) => log(`pet render-process-gone: ${JSON.stringify(details)}`));
  petWin.loadFile(path.join(__dirname, "renderer.html")).catch(error => log(`pet loadFile failed: ${error.stack || error.message}`));
  petWin.on("move", positionSettingsWindow);
  petWin.on("closed", () => {
    petWin = null;
    if (settingsWin && !settingsWin.isDestroyed()) settingsWin.close();
  });
}

function createSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    positionSettingsWindow();
    return;
  }

  log("createSettingsWindow");
  settingsWin = new BrowserWindow({
    width: 280,
    height: 272,
    show: true,
    frame: false,
    title: "Itto Settings",
    transparent: true,
    resizable: false,
    movable: true,
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWin.setAlwaysOnTop(true, "screen-saver");
  settingsWin.webContents.on("did-finish-load", () => {
    log("settings did-finish-load");
    settingsWin.show();
    settingsWin.focus();
    settingsWin.webContents.send("settings:size", currentSize);
    positionSettingsWindow();
  });
  settingsWin.loadFile(path.join(__dirname, "settings.html")).catch(error => log(`settings loadFile failed: ${error.stack || error.message}`));
  settingsWin.on("closed", () => {
    settingsWin = null;
  });
}

app.whenReady().then(() => {
  log("app ready");
  createPetWindow();
});

app.on("activate", () => {
  if (!petWin) createPetWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("window:get-position", () => petWin ? petWin.getPosition() : [0, 0]);
ipcMain.handle("window:set-position", (_event, x, y) => {
  if (!petWin || petWin.isDestroyed()) return;
  petWin.setPosition(Math.round(x), Math.round(y), false);
  positionSettingsWindow();
});
ipcMain.handle("window:get-screen", () => screen.getPrimaryDisplay().workArea);
ipcMain.handle("window:set-size", (_event, key) => {
  if (!sizes[key]) return currentSize;
  currentSize = key;
  keepBottomLeftResize(petWin, sizes[key].width, sizes[key].height);
  if (petWin && !petWin.isDestroyed()) petWin.webContents.send("pet:size", key);
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.webContents.send("settings:size", key);
    positionSettingsWindow();
  }
  return currentSize;
});
ipcMain.handle("settings:toggle", () => {
  if (settingsWin && !settingsWin.isDestroyed() && settingsWin.isVisible()) {
    settingsWin.hide();
  } else {
    createSettingsWindow();
  }
});
ipcMain.handle("settings:close", () => {
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.hide();
});
ipcMain.handle("pet:play-action", (_event, action) => {
  if (petWin && !petWin.isDestroyed()) petWin.webContents.send("pet:play-action", action);
});
ipcMain.handle("window:quit", () => app.quit());