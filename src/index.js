const { ipcMain, dialog, app, BrowserWindow } = require('electron');
const path = require('path');
const { electron } = require('process');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync("src/config.json"));

var hasProxy = false;
if (config.p_type !== "none")
  hasProxy = true;

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
      transparent:false,
      frame: false,
      hasShadow: true,
      show: false,
      webPreferences:{nodeIntegration:true},
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        devTools: true,
        enableRemoteModule: true,
        nodeIntegration: true,
        contextIsolation: false
        }  
    })
    
   // win.webContents.openDevTools();
    win.loadFile(path.join(__dirname, 'index.html'));
    if (hasProxy) {
      var proxyData = config.p_type + "://" + config.p_server + ":" + config.p_port;
      win.webContents.session.setProxy({proxyRules:proxyData});
    }



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

