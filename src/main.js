const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');

let petWindow;
// The cat stays 192px tall (3× source scale); the wider, taller transparent window hosts the multi-disk monitor.
const PET_SIZE = { width: 360, height: 578 };
const CAT_HEIGHT = 192;
const MIN_WINDOW_HEIGHT = 420;
const MAX_WINDOW_HEIGHT = 920;
const settings = {
  stepSound: false,
  meowSound: true,
  quietMode: true,
  skin: 'calico',
  launchAtLogin: false,
};

let previousCpuSample = null;
let cachedProcessCount = null;
let lastProcessCountCheck = 0;
let cachedDisks = [];
let lastDiskUsageCheck = 0;

function cpuTimes() {
  return os.cpus().reduce((sum, cpu) => {
    const total = Object.values(cpu.times).reduce((inner, value) => inner + value, 0);
    sum.total += total;
    sum.idle += cpu.times.idle;
    return sum;
  }, { total: 0, idle: 0 });
}

function cpuUsagePercent() {
  const current = cpuTimes();
  if (!previousCpuSample) {
    previousCpuSample = current;
    return 0;
  }
  const totalDelta = current.total - previousCpuSample.total;
  const idleDelta = current.idle - previousCpuSample.idle;
  previousCpuSample = current;
  if (totalDelta <= 0) return 0;
  return Math.round(Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100)));
}

function queryWindowsProcessCount() {
  if (process.platform !== 'win32') return Promise.resolve(null);
  const now = Date.now();
  if (cachedProcessCount !== null && now - lastProcessCountCheck < 10000) {
    return Promise.resolve(cachedProcessCount);
  }
  return new Promise((resolve) => {
    execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true, timeout: 3000 }, (error, stdout) => {
      lastProcessCountCheck = Date.now();
      if (!error && stdout) {
        cachedProcessCount = stdout.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith('INFO:')).length;
      }
      resolve(cachedProcessCount);
    });
  });
}

function queryWindowsDisks() {
  if (process.platform !== 'win32') return Promise.resolve([]);
  const now = Date.now();
  // Capacity and performance counter data are refreshed together every 2.5 seconds.
  if (cachedDisks.length && now - lastDiskUsageCheck < 2500) return Promise.resolve(cachedDisks);
  const command = "\n$logical = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -in 2,3 -and $_.Size -gt 0 }\n$perf = @{}\nGet-CimInstance Win32_PerfFormattedData_PerfDisk_LogicalDisk | Where-Object { $_.Name -ne '_Total' } | ForEach-Object { $perf[$_.Name] = $_ }\n$logical | ForEach-Object {\n  $p = $perf[$_.DeviceID]\n  [PSCustomObject]@{\n    Drive = $_.DeviceID\n    Label = $_.VolumeName\n    DriveType = $_.DriveType\n    Size = [double]$_.Size\n    Free = [double]$_.FreeSpace\n    ReadBps = if ($p) { [double]$p.DiskReadBytesPersec } else { 0 }\n    WriteBps = if ($p) { [double]$p.DiskWriteBytesPersec } else { 0 }\n  }\n} | ConvertTo-Json -Compress\n";
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, timeout: 6000 }, (error, stdout) => {
      lastDiskUsageCheck = Date.now();
      if (!error && stdout) {
        try {
          const parsed = JSON.parse(stdout);
          const disks = (Array.isArray(parsed) ? parsed : [parsed])
            .map((disk) => {
              const size = Number(disk.Size);
              const free = Number(disk.Free);
              if (!Number.isFinite(size) || size <= 0 || !Number.isFinite(free)) return null;
              const used = Math.max(0, size - free);
              return {
                drive: disk.Drive || 'DISK',
                label: disk.Label || (Number(disk.DriveType) === 2 ? '外接盘' : '本地盘'),
                removable: Number(disk.DriveType) === 2,
                usedGb: Number((used / 1024 ** 3).toFixed(1)),
                totalGb: Number((size / 1024 ** 3).toFixed(1)),
                percent: Math.round((used / size) * 100),
                readBps: Math.max(0, Number(disk.ReadBps) || 0),
                writeBps: Math.max(0, Number(disk.WriteBps) || 0),
              };
            })
            .filter(Boolean)
            .sort((a, b) => a.drive.localeCompare(b.drive));
          if (disks.length) cachedDisks = disks;
        } catch {
          // Keep the last successful multi-disk reading when a transient PowerShell query fails.
        }
      }
      resolve(cachedDisks);
    });
  });
}

async function getSystemMetrics() {
  const totalMemory = os.totalmem();
  const usedMemory = Math.max(0, totalMemory - os.freemem());
  const [processCount, disks] = await Promise.all([queryWindowsProcessCount(), queryWindowsDisks()]);
  return {
    cpu: cpuUsagePercent(),
    memoryPercent: totalMemory ? Math.round((usedMemory / totalMemory) * 100) : 0,
    memoryUsedGb: Number((usedMemory / 1024 ** 3).toFixed(1)),
    memoryTotalGb: Number((totalMemory / 1024 ** 3).toFixed(1)),
    uptimeSeconds: Math.floor(os.uptime()),
    processCount,
    disks,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getWorkingAreaAt(x, y) {
  return screen.getDisplayNearestPoint({ x, y }).workArea;
}

function createPetWindow() {
  const primaryArea = screen.getPrimaryDisplay().workArea;
  petWindow = new BrowserWindow({
    width: PET_SIZE.width,
    height: PET_SIZE.height,
    x: primaryArea.x + primaryArea.width - PET_SIZE.width - 28,
    y: primaryArea.y + primaryArea.height - PET_SIZE.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  petWindow.setAlwaysOnTop(true, 'pop-up-menu');
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.loadFile(path.join(__dirname, 'index.html'));
  petWindow.on('closed', () => { petWindow = null; });
}

function sendCommand(command, payload = {}) {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet-command', { command, payload });
  }
}

function setLaunchAtLogin(enabled) {
  settings.launchAtLogin = enabled;
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: enabled });
  }
}

function showPetMenu(screenX, screenY) {
  settings.launchAtLogin = app.isPackaged && app.getLoginItemSettings().openAtLogin;
  const skinItems = [
    { label: '经典三花', value: 'calico', checked: settings.skin === 'calico' },
    { label: '灰白（示范皮肤）', value: 'silver', checked: settings.skin === 'silver' },
    { label: '橘白（示范皮肤）', value: 'orange', checked: settings.skin === 'orange' },
  ].map((item) => ({
    label: item.label,
    type: 'radio',
    checked: item.checked,
    click: () => {
      settings.skin = item.value;
      sendCommand('skin', { skin: item.value });
    },
  }));

  const menu = Menu.buildFromTemplate([
    {
      label: '声音',
      submenu: [
        {
          label: '脚步声', type: 'checkbox', checked: settings.stepSound,
          click: (entry) => { settings.stepSound = entry.checked; sendCommand('sound', settings); },
        },
        {
          label: '喵叫声', type: 'checkbox', checked: settings.meowSound,
          click: (entry) => { settings.meowSound = entry.checked; sendCommand('sound', settings); },
        },
      ],
    },
    { label: '切换皮肤/毛色', submenu: skinItems },
    {
      label: '安静陪伴模式', type: 'checkbox', checked: settings.quietMode,
      click: (entry) => {
        settings.quietMode = entry.checked;
        sendCommand('quiet-mode', { enabled: settings.quietMode });
      },
    },
    { type: 'separator' },
    { label: '投喂小鱼干', click: () => sendCommand('feed-fish') },
    { label: '丢一个毛线球', click: () => sendCommand('throw-yarn') },
    { type: 'separator' },
    {
      label: '开机自启动', type: 'checkbox', checked: settings.launchAtLogin,
      click: (entry) => setLaunchAtLogin(entry.checked),
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
  menu.popup({ window: petWindow, x: Math.round(screenX), y: Math.round(screenY) });
}

ipcMain.handle('pet:get-bounds', () => petWindow?.getBounds() ?? { x: 0, y: 0, ...PET_SIZE });
ipcMain.handle('pet:get-cursor-point', () => screen.getCursorScreenPoint());
ipcMain.handle('system:get-metrics', () => getSystemMetrics());
ipcMain.handle('pet:get-work-area', (_event, point) => getWorkingAreaAt(point?.x ?? 0, point?.y ?? 0));
ipcMain.handle('pet:set-monitor-height', (_event, requestedHeight) => {
  if (!petWindow || petWindow.isDestroyed()) return null;
  const current = petWindow.getBounds();
  const area = getWorkingAreaAt(current.x, current.y);
  const height = clamp(Math.round(requestedHeight), MIN_WINDOW_HEIGHT, Math.min(MAX_WINDOW_HEIGHT, area.height));
  const x = clamp(current.x, area.x, area.x + area.width - PET_SIZE.width);
  const y = clamp(current.y + current.height - height, area.y, area.y + area.height - height);
  PET_SIZE.height = height;
  petWindow.setBounds({ x, y, width: PET_SIZE.width, height }, false);
  return { x, y, width: PET_SIZE.width, height, workArea: area };
});
ipcMain.handle('pet:move-window', (_event, desired) => {
  if (!petWindow || petWindow.isDestroyed()) return null;
  const area = getWorkingAreaAt(desired.x, desired.y);
  const x = clamp(Math.round(desired.x), area.x, area.x + area.width - PET_SIZE.width);
  const y = clamp(Math.round(desired.y), area.y, area.y + area.height - PET_SIZE.height);
  petWindow.setPosition(x, y, false);
  return { x, y, width: PET_SIZE.width, height: PET_SIZE.height, workArea: area };
});
ipcMain.handle('pet:drop-window', (_event, desired) => {
  if (!petWindow || petWindow.isDestroyed()) return null;
  const area = getWorkingAreaAt(desired.x, desired.y);
  const x = clamp(Math.round(desired.x), area.x, area.x + area.width - PET_SIZE.width);
  // The monitor working-area floor is the base standing surface. This keeps the cat above the taskbar.
  const y = area.y + area.height - PET_SIZE.height;
  petWindow.setPosition(x, y, false);
  return { x, y, width: PET_SIZE.width, height: PET_SIZE.height, workArea: area };
});
ipcMain.on('pet:show-menu', (_event, point) => showPetMenu(point.x, point.y));

app.whenReady().then(() => {
  createPetWindow();
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createPetWindow();
  });
});

app.on('window-all-closed', () => app.quit());
