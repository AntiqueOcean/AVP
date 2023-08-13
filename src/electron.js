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
  "autoSync":true},
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
app.on('ready', () => { 
  const _path = app.getPath('userData');
  if (!fs.existsSync(_path)) {
    fs.mkdir(_path, function(err) {
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
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: false
        }  
    })
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

    ipcMain.on("fullScreenState", (event, data) => {
      event.returnValue = win.isFullScreen();
    });
    
    ipcMain.on("getAppPath", (event, data) => {
      event.returnValue = app.getAppPath();
    });

    ipcMain.on("getLocalPath", (event, data) => {
      const _path_ = app.getPath('userData');
      event.returnValue = _path_;
    });

    win.webContents.openDevTools();
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


function windowQuit() {
  window.close();
}

function windowMaximize() {
  console.log(electron);
  electron.BrowserWindow.maximize();
}


