/* Copyright (C) 2023 antiqueOcean <antiqueocean.dev@gmail.com> - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential.
 */


const { app, BrowserWindow, contextBridge,
        ipcMain } = require('electron');
const path = require('path');
const { electron } = require('process');
const fs = require('fs');
const { platform } = require('os');


const configDefaultContent = `
[{
  "temp_popup":true,
  "proxy_type":"none",
  "proxy_server":"",
  "proxy_port":"",
  "theme":"dark",
  "font":"medium",
  "tick_rate":25,
  "max_history_size":128,
  "open_last":true,
  "open_as_left":true,
  "forwarding_time":10,
  "volume":100,
  "last_path":"",
  "blur":0,
  "contrast":100,
  "grayscale":0,
  "hue":-7,
  "invert":0,
  "autoPlay":true,
  "autoPlayNext":true,
  "replay":false,
  "brightness":100,
  "audioDelayAmount":0,
  "audioDelayAddingAmount":50,
  "autoSync":true,
  "showPreview":true,
  "previewStep":60,
  "extractAudio":false,
  "singleAudioExport":false,
  "convertHevc":true,
  "hevcConversionrate":10},
  {
  }]
`;

const inputDefaultContent = `
[{
  "play":["Space", "KeyP"],
  "forward":["ArrowRight"],
  "backward":["ArrowLeft"],
  "volumeUp":["ArrowUp"],
  "volumeDown":["ArrowDown"],
  "mute":["KeyM"],
  "fullscreen":["KeyF", "F11", "Enter"],
  "quit":["Escape"],
  "invert":["KeyI"],
  "contrastDown":["KeyZ"],
  "contrastReset":["KeyX"],
  "contrastUp":["KeyC"],
  "brightnessDown":["KeyQ"],
  "brightnessReset":["KeyW"],
  "brightnessUp":["KeyE"],
  "hueDown":["KeyA"],
  "hueReset":["KeyS"],
  "hueUp":["KeyD"],
  "grayDown":["KeyR"],
  "grayReset":["KeyT"],
  "grayUp":["KeyY"],
  "blurDown":["KeyV"],
  "blurReset":["KeyB"],
  "blurUp":["KeyN"],
  "delayAudioForward":["BracketRight"],
  "delayAudioBackward":["BracketLeft"]},
{
}]
`;

const historyDefaultContent = "[]";

//const _config = JSON.parse(fs.readFileSync("src/config.json"));
//const config = _config[0];




// var hasProxy = false;
// if (config.proxy_type != "none")
//   hasProxy = true;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

var win;
var background_process_win;
var settings_win;

app.on('ready', () => { 
  const _path = app.getPath('userData');

  if (!fs.existsSync(_path + "/audiotracks")) {
    fs.mkdir(_path + "/audiotracks", function(err) {
    });
  }
  if (!fs.existsSync(_path + "/video")) {
    fs.mkdir(_path + "/video", function(err) {
    });
  }
  if (!fs.existsSync(_path + "/subtitles")) {
    fs.mkdir(_path + "/subtitles", function(err) {
    });
  }
  if (!fs.existsSync(_path + "/config.json")) {
    fs.writeFile(_path + "/config.json", configDefaultContent, function (err) {
    });
  }

  if (!fs.existsSync(_path + "/input.json")) {
    fs.writeFile(_path + "/input.json", inputDefaultContent, function (err) {
      if(!err) {
        console.log(_path + "/input.json");
      }
    });
  }

  if (!fs.existsSync(_path + "/history.json")) {
    fs.writeFile(_path + "/history.json", historyDefaultContent, function (err) {
    });
  }

  setTimeout(() => {
    win = new BrowserWindow({
      width: 800,
      height: 600,
      minWidth: 420,
      minHeight: 340,
      resizable: true,
      icon: '/home/mak/Documents/GitHub/AVP/src/Styles/images/icon.png',
      fullscreen: false,
      titleBarStyle: 'hidden',
      nodeIntegration: true,
      transparent:false,
      frame: false,
      hasShadow: true,
      show: false,
      webPreferences: {
        enableRemoteModule: true,
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: false
        }  
    });

      background_process_win = new BrowserWindow({
      width: 320,
      height: 320,
      nodeIntegration: true,
      transparent:false,
      show: false,
      webPreferences: {
        enableRemoteModule: true,
        nodeIntegration: true,
        contextIsolation: false
        }  
    });

    settings_win = new BrowserWindow({
      width: 640,
      height: 480,
      nodeIntegration: true,
      transparent:false,
      show: false,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        enableRemoteModule: true,
        nodeIntegration: true,
        contextIsolation: false
        }  
    });

    ipcMain.on("toggleMaximize", function(event) {
      if(win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    });

    ipcMain.on("toggleMinimize", function(event) {
      if(win.isMinimized()) {
        win.unminimize();
      } else {
        win.minimize();
      }
    });

    ipcMain.on("toggleFullscreen", function(event) {
      if(win.fullScreen) {
        win.setFullScreen(false);
      } else {
        win.setFullScreen(true);
      }
    });

    ipcMain.on("fullScreenState", (event) => {
      event.returnValue = win.isFullScreen();
    });
    
    ipcMain.on("getAppPath", (event) => {
      event.returnValue = app.getAppPath();
    });

    ipcMain.on("getLocalPath", (event) => {
      const _path_ = app.getPath('userData');
      event.returnValue = _path_;
    });

    ipcMain.handle("setWindowSize", async(event, width, height) => {
      win.setSize(width, height);
    });

    ipcMain.on("quitWindow", (event) => {
      app.quit();
    });

    ipcMain.handle("generatePreview", async(event, input, length) => {
      background_process_win.send("bg_generatePreview", input, length);
  });

    ipcMain.handle("generatedPreviewResult", async(event, array) => {
      win.send("main_generatedPreviewResult", array);
  });

  ipcMain.handle('openSettings', async(event, config, key) => {
    settings_win.show();
    settings_win.send('reciveData', config, key);
  });

  ipcMain.handle('closeSettings', async(event, config, key) => {
    settings_win.hide();
    win.send('settingResult', config, key);
  });

    settings_win.loadFile(path.join(__dirname, 'settings.html'));
    // settings_win.webContents.openDevTools();
    settings_win.setMenu(null);


    background_process_win.loadFile(path.join(__dirname, 'background_process.html'));
    // background_process_win.webContents.openDevTools();
    // background_process_win.show();


    // win.webContents.openDevTools();
    win.setMenu(null);
    win.loadFile(path.join(__dirname, 'index.html'));
    // if (hasProxy) {
    //   var proxyData = config.proxy_type + "://" + config.proxy_server + ":" + config.proxy_port;
    //   win.webContents.session.setProxy({proxyRules:proxyData});
    // }

    win.show();

    win.webContents.once('dom-ready', () => {
      //when the dom is ready
    });
  }, 100);


});



// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
  
});


function quit() {
  app.quit();
}

function windowMaximize() {
  console.log(electron);
  electron.BrowserWindow.maximize();
}


