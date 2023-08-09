const { app, BrowserWindow, contextBridge,
        ipcMain } = require('electron');
const path = require('path');
const { electron } = require('process');
const fs = require('fs');
//var configFile = new File("~")


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
  setTimeout(() => {
    win = new BrowserWindow({
      width: 800,
      height: 600,
      minWidth: 420,
      minHeight: 340,
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