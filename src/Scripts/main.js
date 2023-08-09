/* Copyright (C) 2023 antiqueOcean <antiqueocean.dev@gmail.com> - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential.
 */

/* ------------- --------- ------------- */
/* ------------- [Headers] ------------- */
/* ------------- --------- ------------- */

import * as basic from './basics.js';
import * as listen from './listener.js';
import * as menu from './menus.js';

const { dialog, electron, remote,
        contextBridge, ipcRenderer, app
} = require('electron');

const { constants } = require("original-fs");

const path = require('path');
// const { electron } = require('process');
const fs = require('fs');
const { event } = require("jquery");

/* ------------- ----------- ------------- */
/* ------------- [variables] ------------- */
/* ------------- ----------- ------------- */
// loading set variables

const appPath = ipcRenderer.sendSync("getAppPath");
const localPath = ipcRenderer.sendSync("getLocalPath");

const _config = JSON.parse(fs.readFileSync(localPath + "/config.json"));
export const config = _config[0];
const history = JSON.parse(fs.readFileSync(localPath + "/history.json"));
const key = JSON.parse(fs.readFileSync(localPath + "/input.json"))[0];



// input variables
var pausingControl = false;
var inputingTime = false;
var fileValueInterval;


// global ui variables
var tickRate = config.tick_rate; //ms
var isTempMenuOpen = false;

var lastTopBarHeight = 80;
var lastBottomBarY = 200;
var cursoHideTimer = 500;
var fullScreenState = false;
var currentInputElement = null;

// video control variables
var currentDuration = 0;
var currentTime = 0;
var playing = false;
var timebarMouseX;
var forwardingSeconds = config.forwarding_time;
var currentPath = "none";
var currentDirectory = "";
var lastDirectory = "none";
var fileList = [];

//volume control variables
var lastVolume = 25;




//windows
var settingsWindow;
/* ------------- ---------- ------------- */
/* ------------- [Elements] ------------- */
/* ------------- ---------- ------------- */

// video control elements
var mainPlayer = document.getElementById("mainPlayer");
var video = document.getElementById("video");
var timeStamp = document.getElementById("timeStamp"); 
var timeInput = document.getElementById("timeInput");
var timerBarMiddle = document.getElementById("timerBarMiddle"); 
var timerBarMiddleBar = document.getElementById("timerBarMiddleBar");
var timerBarRight = document.getElementById("timerBarRight");
var backwardButton = document.getElementById("backwardButton");
var playButton = document.getElementById("playButton");
var forwardButton = document.getElementById("forwardButton");
var filePathInput = document.getElementById("fname");
var fileTitle = document.getElementById("fnameTitle");
var editCheck = document.getElementById("editCheck");

//volume control elements
var volumeBar = document.getElementById("volumeBar");
var volumeBarBg = document.getElementById("volumeBarBg");
var volumeController = document.getElementById("volumeController");
var volumeNumberInput = document.getElementById("volumeNumberInput");
var muteButton = document.getElementById("muteButton");

//other elements
var tempMenuPlaceHolder = document.getElementById("currentTempMenu");
var notifications = document.getElementById("notifications");
var mainWin = document.getElementById("mainWin");
const topBar = document.getElementById("topBar");
const bottomBar = document.getElementById("bottomBar");
const barFileSelectInput = document.getElementById("fileSelectInput");

/* ------------- ------------------- ------------- */
/* ------------- [context menu data] ------------- */
/* ------------- ------------------- ------------- */

var playermenu_items = `
<ul style='--wrap: no-wrap;'>
<li style='--image:url(svg/previous.svg)'></li>
<li style='--image:url(svg/pause.svg)' onclick="switchPlayPause()"></li>
<li style='--image:url(svg/next.svg)'></li>
</ul>
<hr>
<div class="parent" onmouseover="setBoundingVariables(this);" style="--tag:'📁'" onclick="setTheme('dark', this);">open
    <div class="list-menu child">
    <label>offline</label>
        <div style="--tag:'📼'" onclick="">file</div>
        <div style="--tag:'📂'" onclick="">directory</div>
    <label>online</label>
        <div style="--tag:'🌐'" onclick="">url</div>
        <div style="--tag:'▶️'" onclick="">youtube</div>
    </div>
</div>

<div class="parent" onmouseover="setBoundingVariables(this);" style="--tag:'↩'">recent
    <div class="list-menu child">
        <div style="--tag:'⤵'" onclick="">place holder 1</div>
        <div style="--tag:'⤵'" onclick="">place holder 2</div>
    </div>

</div>

<div class="parent" onmouseover="setBoundingVariables(this);" style="--tag:'🗨'">subtitle
    <div class="list-menu child">
        <div style="--tag:'⤵'" onclick="toggleSubtitle()">place holder 1</div>
        <div style="--tag:'⤵'" onclick="">place holder 2</div>
    </div>

</div>

<div class="parent" onmouseover="setBoundingVariables(this);" style="--tag:'👁'"">view
    <div class="list-menu child">
        <div class="parent" onmouseover="setBoundingVariables(this);" style="--tag:'🖌️';">themes
            <div class="list-menu child">
            
            </div>
        </div>
        <div style="--tag:'↗'" onclick="setFullscreen()">fullscreen</div>
    </div>
</div>

<div style="--tag:'*'" onclick="openSettings();">settings</div>
`;

var volume_items = `
<label>volume: </label>
<div style="--tag:'%'" onclick="setVolume(100);">100</div>
<div style="--tag:'%'" onclick="setVolume(75);">75</div>
<div style="--tag:'%' " onclick="setVolume(50);">50</div>
<div style="--tag:'%'" onclick="setVolume(25);">25</div>
<div style="--tag:'-'" onclick="toggleMute()">mute</div>`;

var info_items = `
<label>Info: </label>
<div style="--tag:'🪙' " onclick="">Support</div>
<div style="--tag:'ℹ️'" onclick="alert('info')">About</div>
<hr>
<div style="--tag:'❌'" onclick="window.close()">Exit</div>`;

// running initializer
init();

/* ------------- -------- ------------- */
/* ------------- [Events] ------------- */
/* ------------- -------- ------------- */ 

window.addEventListener("focusin", function(e) {
    if (e.target.nodeName === "INPUT") {
        pauseKeyControl();
        currentInputElement = e.target;
    }
})

window.addEventListener("focusout", function(e) {
    if (e.target.nodeName === "INPUT") {
        pauseKeyControl(false);
        currentInputElement = null;
    }
})

timeInput.addEventListener("focusin", () => {
    inputingTime = true;
});

timeInput.addEventListener("focusout", () => {
    inputingTime = false;
});

mainPlayer.addEventListener("dragover", function(event) {
    event.preventDefault();
});


/* ------------- ----------- ------------- */
/* ------------- [Functions] ------------- */
/* ------------- ----------- ------------- */


/* *** [Functions] *** */
/* Primitive Functions */

function init() {
    setVolume(config.volume);
    if (config.open_last) {
        loadVideo(config.last_path);
    }

    updateAll();
} 

function safeClose() {
    config.volume = Math.round(video.volume*100);
    if (video.readyState == 4)
        config.last_path = currentPath;
    basic.updateConfigFile(config);
    addCurrentToHistory();

    updateHistoryFile();
    setInterval (() => {window.close();}, 250);
}

function toggleFullscreen(e){
    menu.closeTempMenu();
    ipcRenderer.send("toggleFullscreen");
    fullScreenState = ipcRenderer.sendSync("fullScreenState");
    fullscreenUiCheck(e);
}

function openSettings() {
    const _width = 720;
    const _height = 580;
    var _posX = screen.width/2 - _width/2;
    var _posY = screen.height/2 - _height/2;

    settingsWindow = window.open('settings.html', '_blank', `
    width=${_width},
    height=${_height},
    minWidth=${_width},
    minHeight=${_height},
    left=${_posX},
    top=${_posY},
    frame=false,
    resizable=false,
    alwaysOnTop=true,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
        }
    `
    );
}

function loadVideoFromInput() {
    if (fname.value != "none")
        loadVideo(fname.value);
    editCheck.checked = false;
    updateUi();
}

function loadVideoFromDrop(event) {
    event.preventDefault();
    loadVideo(event.dataTransfer.files[0].path);
}

function refreshDirectory() {
    if (currentDirectory != lastDirectory) {
        fileList = [];
        lastDirectory = currentDirectory;
        fs.readdir(currentDirectory, function(err, _files) {
            if(!err) {
                _files.forEach(_file => {
                    if (_file)
                    fileList.push(currentDirectory + "/" + _file);
                });

            }
        });
    }
}

function updateVideoFilters() {
    video.style.filter = `contrast(${config.contrast}%) blur(${config.blur}px) grayscale(${config.grayscale}%) hue-rotate(${config.hue}deg) invert(${config.invert}%) brightness(${config.brightness}%)`;
}


video.onloadedmetadata = function() {
    currentDuration = this.duration;
    currentTime = 0;

    updateAll();
};



function placeIn (input) {
    var temp = input;
    while (temp.indexOf('!*') != -1) {
        var start = temp.indexOf('!*');
        
        var end = temp.indexOf('*!') + 2;
        var referanceElement = null;
        var askingFor;
        var result = '';
        if (temp[start + 2] == 'i') {
            var idA = start + 3;
            var idB = temp.indexOf('|', start);
            referanceElement = document.getElementById(temp.substring(idA, idB));
            askingFor = temp.substring(idB+1, end-2);
        }
        if (askingFor === 'X') {
            result = referanceElement.getBoundingClientRect().left;
        }
        else if (askingFor === 'Y') {
            result = referanceElement.getBoundingClientRect().top;
        }
        else if (askingFor == 'W') {
            result = referanceElement.getBoundingClientRect().width;
        }
        else if (askingFor == 'H') {
            result = referanceElement.getBoundingClientRect().height;
        }
        else if (askingFor == 'XW') {

            result = referanceElement.getBoundingClientRect().left + referanceElement.getBoundingClientRect().width;
        }
        else if (askingFor == 'YH') {
            result = referanceElement.getBoundingClientRect().top + referanceElement.getBoundingClientRect().height;
        }
        temp = temp.replace(temp.substring(start, end), result);
    }
    return temp;
}

// function addTempMenu(event, type, id, items) {
//     closeTempMenu();
//     var header;
//     var code;
//     if (type == "list-menu") {
//         header = `<div class="list-menu" id = ${id} style="--mouse-x: ${event.clientX}px; --mouse-y: ${event.clientY}px;">`;
//     }
//     code = header + items + "</div>";
//     document.getElementById("currentTempMenu").innerHTML = code;
//     setTimeout(() => {
//         window.addEventListener("click", closeTempMenu);
//         window.addEventListener("contextmenu", closeTempMenu);
//     }, 50);
// }

function getPlayerCurrentColor() {
    var _temp_color = "";
    for (var i = 1; i < 66/3; i++) {
        _temp_color += String.fromCharCode(s("--colorbase"+i).substring(1, 4));
        var _temp_color_2 = String.fromCharCode(s("--colorbase"+i).substring(4, 7));
        if (_temp_color_2 != "000")
            _temp_color += String.fromCharCode(s("--colorbase"+i).substring(4, 7));
    }
    return _temp_color;
}

function getFontCurrentColor(input) {
    var _temp_color = "";
    
    return _temp_color;
}

function toCharCode(input) {
    var result = "";
    var result2 = "";
    for (var i = 0; i < input.length; i++) {
        result += `${("000" + input.charCodeAt(i)).slice(-3)}`;
    }
    for (var i = 0; i < result.length; i+= 6) {
        result2 += "#" + result.slice(i, i+6);
    }
    if ((result.length - 1) % 6 != 0) {
        result2 += "000";
    }
    return result2;
}

function updateHistoryFile() {
    var _str = JSON.stringify(history);
    for (var i = 0; i < _str.length; i++) {
        if (_str[i] == ',' || _str[i] == '{') {
            _str = _str.slice(0, i+1) + "\n" + _str.slice(i+1);
            i++;
        } else if (_str[i] == '}') {
            _str = _str.slice(0, i) + "\n" + _str.slice(i);
            i++;
        }
    }

    fs.writeFile(localPath + "/history.json", _str, (error) => {
        if(error) {
            console.error(error);
            throw error;
        }
    });
}



function getFromIndex(input, index) {
    var currentElement = input;

    if(index < 0) {
        for (var i = 0; i <= Math.abs(index); i++){
            if (currentElement.parentNode != "undefined")
                currentElement = currentElement.parentNode;
            else
                break;
        }
    }
    else if(index > 0){
        for (var i = 0; i <= Math.abs(index); i++){
            if (currentElement.firstChild.nodeName != "undefined") 
                currentElement = currentElement.firstChild.nodeName; 
            else
                break;
        }
        
    }
    return currentElement;
}
  
function updateNavigator() {
    navigator.mediaSession.metadata = new MediaMetadata({
        title: path.parse(video.getAttribute("src")).base
      });
}

function updateUi() {
    basic.setTheme(config.theme, config, false);
    fileTitle.value = path.parse(currentPath).base;
    windowTitle.innerHTML = "AVP [" + path.parse(currentPath).base + ']';
    filePathInput.value = currentPath;
}

function updateAll(){
    updateUi();
    updateNavigator();
    updateTimerUi(true);
    updateVideoFilters();
}


function setNewTime(input) {
    let settingTime;
    if(typeof input === 'undefined') {
      var leftPos = timerBarMiddle.getBoundingClientRect().left + window.scrollX;
      settingTime = ((timebarMouseX-leftPos) / timerBarMiddle.getBoundingClientRect().width) * (currentDuration);
    }
    else {
      settingTime = input;
    }
    video.currentTime = settingTime;
    currentTime = settingTime;
  }
  
  function updateTimerUi(input){
    if (!inputingTime)
        timeInput.value = basic.calcSeconds(currentTime);
    timerBarMiddleBar.style.width = (currentTime/currentDuration*100)+'%';
    if (input)
      timerBarRight.innerHTML = basic.calcSeconds(currentDuration);
}
  
function updateTimeStamp(event) {
    timebarMouseX = event.clientX;
    var leftPos = timerBarMiddle.getBoundingClientRect().left + window.scrollX;
    timeStamp.style.left = (timebarMouseX-leftPos-(timeStamp.getBoundingClientRect().width / 2))+'px';
    timeStamp.innerHTML = basic.calcSeconds(((timebarMouseX-leftPos) / timerBarMiddle.getBoundingClientRect().width) * (currentDuration)) + ' [' + (Math.round(((((timebarMouseX-leftPos) / timerBarMiddle.getBoundingClientRect().width) * (currentDuration)/currentDuration*100)) * 10)/10).toFixed(1)+'%]'; 
}


var tickInterval = setInterval(tick, tickRate);
function tick() {
    playing = !video.paused;
    if (cursoHideTimer <= 0 && mainWin.style.cursor != "none" && fullScreenState)
        mainWin.style.cursor = "none";
    else if (fullScreenState)
        cursoHideTimer -= tickRate;

    if (playing)
        playButton.style.setProperty ("--image", "url(svg/pause.svg)");
    else
        playButton.style.setProperty ("--image", "url(svg/play.svg)");
    currentTime = video.currentTime;
    updateTimerUi();
    basic.handleNotifications(tickRate);
}

var updateBarMouseUpInterval;
function updateBar() {
        window.addEventListener("mouseup", setNewTimeEnd);
        updateBarMouseUpInterval = setInterval(setNewTime, 25); 
}

function setNewTimeEnd(){
    clearInterval(updateBarMouseUpInterval);
    window.removeEventListener("mouseup", setNewTimeEnd);
    //delete updateBarMouseUpInterval;
}



/* ***** [Functions] ***** */
/* Video Control Functions */
//loadVideo("/home/mak/Downloads/Video/Its.Always.Sunny.in.Philadelphia.S02E08.480p.WEB-DL.PaHe.VinaDL.mkv");
function loadVideo(input) {
    if(video.readyState === 4) {
        addCurrentToHistory();
    }
    video.setAttribute("src", input);
    if (config.open_as_left)
        setNewTime(getFromHistory(input));
    currentPath = input;
    currentDirectory = path.parse(currentPath).dir;
    refreshDirectory();

    if (!video.playing)
        video.play();
    if(video.readyState === 4) {
         basic.addNotification(path.parse(currentPath).base, 8000, true, "videoTitle", undefined, `onclick="removeNotificationById(this.id);"`);
    }

    updateAll();
}

function addCurrentToHistory() {
    if (video.readyState === 4 && config.open_as_left) {
        var _exists = false;
        for (var i = 0; i < history.length; i++) {
            if (currentPath == history[i].path) {
                history[i].last = video.currentTime;
                _exists = true;
                break;
            }
        }
        if (!_exists) {
            history.unshift({path: currentPath, last: video.currentTime});
        }
    }
    if (history.length > config.max_history_size)
        history.length = config.max_history_size;
    updateHistoryFile();
}

function getFromHistory(input) {
    for (var i = 0; i < history.length; i++) {
        if (input == history[i].path) {
            return history[i].last;
        }
    }
    return 0;
}

function quitCurrentAction() {
    if (currentInputElement != null) {
        currentInputElement.blur();
    } else if (fullScreenState) {
        toggleFullscreen();
    } else {
        forcePause();
        ipcRenderer.send("toggleMinimize");
    }
}

function switchPlayPause() {
    if (video != "undefined")
    {
        if (video.paused) {
            forcePlay();
        }
        else {
            forcePause();
        }
    }
}

function forcePlay() {
    if (video.readyState == 4) {
        video.play();
        basic.addNotification("⏯️ Playing", 1000, true, "playState", "var(--alt-color-green)",  `onclick="removeNotificationById(this.id)"`);
    }
}

function forcePause() {
    if (video.readyState == 4) {
        video.pause();
        basic.addNotification("⏯️ Paused", 1000, true, "playState", "var(--alt-color-red)",  `onclick="removeNotificationById(this.id)"`);
    }
}

function forwardSeconds(_sec = forwardingSeconds) {
    setNewTime(currentTime+_sec);
    var _out = "> +" + _sec + "s";
    basic.addNotification(_out, 1500, true, "forwardbackward", undefined,  `onclick="removeNotificationById(this.id)"`);
}

function backwardSeconds(_sec = forwardingSeconds) {
    setNewTime(currentTime-_sec);
    var _out = "< -" + _sec + "s";
    basic.addNotification(_out, 1500, true, "forwardbackward", undefined,  `onclick="removeNotificationById(this.id)"`);
}

function playPath() {
    dialog.showOpenDialog(electronSquirrelStartup.BrowserWindow.win, {
        properties: ['openFile', 'openDirectory']
      }).then(result => {
        console.log(result.canceled)
        console.log(result.filePaths)
      }).catch(err => {
        console.log(err)
      })
}

function playFiles(input) {
    
    if (input.length == 1) {
        playPath(input[0])
    }
}

function setTimeFromInput() {
    setNewTime(convertToSeconds(timeInput.value));
    timeInput.blur();
}

function playUrl(intput) {

}

function playNext() {
    const _index = fileList.indexOf(currentPath) + 1;
    if (_index < fileList.length)
        loadVideo(fileList[_index]);
    else 
        loadVideo(fileList[0]);
}

function playPrevious() {
    const _index = fileList.indexOf(currentPath) - 1;
    if (_index >= 0)
        loadVideo(fileList[_index]);
    else 
        loadVideo(fileList[fileList.length-1]);
}

/* ****** [Functions] ***** */
/* Volume Control Functions */

function updateVolumeUi(){
    volumeBar.style.width = (video.volume*100) + "%";
    volumeNumberInput.value = Math.round(video.volume * 100);
    if (video.volume == 0) 
        muteButton.style.setProperty("--image", "url(svg/audioOff.svg)");
    else 
        muteButton.style.setProperty("--image", "url(svg/audioOn.svg)");
}

function setVolume(input) {
    volumeNumberInput.blur();
    var _input = Math.round(input);
    if (input > 100)
        _input = 100;
    else if (input < 0) 
        _input = 0;
    video.volume = _input/100;
    if (_input != 0)
        basic.addNotification("🔈" + Math.round(_input) + "%", 1000, true, "volumechange");
    else {
        basic.addNotification("🔇 Muted", 4000, true, "mute", undefined, `onclick="toggleMute(); removeNotificationById(this.id);"`);
    }
    updateVolumeUi();
}

function setVolumeFromBar(event) {
    var _mouseX = event.clientX;
    var poistion = Math.abs(volumeBarBg.getBoundingClientRect().x - _mouseX);
    var width = (poistion / volumeBarBg.getBoundingClientRect().width) * 100;
    if (width < 10) {
        width = 0;
        lastVolume = Math.round(video.volume * 100);
    }
    else if (width > 90)
        width = 100;
    setVolume(width);
}

function setVolumeFromMouseWheel(event) {
    var _amount = 2;
    var _direction = -1;
    var _current = video.volume;
    if (event.deltaY < 0)
    _direction = 1;
    setVolume((_current * 100)+(_amount*_direction));
}

function setVolumeFromInput() {
    setVolume(volumeNumberInput.value);
}


function toggleMute(){
    if (video.volume === 0 && lastVolume != 0)
        setVolume(lastVolume);
    else if (video.volume == 0 && lastVolume == 0)
        setVolume(25);
    else {
        lastVolume = Math.round(video.volume * 100);
        setVolume(0);
    }    
}

volumeController.addEventListener("mousedown", e => {
    if (e.button == 1)
    {
        toggleMute();
    }
});


/* ****** [Functions] ******* */
/* Subtitle Control Functions */

function toggleSubtitle() {
    alert(video.textTracks.length);
}

/* ***** [Functions + Events] ***** */
/* *** Keyboard Input Functions *** */

window.onkeydown = function(event) {
    var code = event.code;
    if (!pausingControl) {
        console.log(event.code);
        menu.closeTempMenu();
        if (basic.isKey(code, key.play)) {
            switchPlayPause();
            menu.closeTempMenu();
        }
        else if (basic.isKey(code, key.forward)) {
            forwardSeconds();
        }
        else if (basic.isKey(code, key.backward)) {
            backwardSeconds();
        }
        else if (basic.isKey(code, key.volumeUp)) {
            setVolume(video.volume*100+2);
        }
        else if (basic.isKey(code, key.volumeDown)) {
            setVolume(video.volume*100-2);
        }
        else if (basic.isKey(code, key.mute)) {
            toggleMute();
        }
        else if (basic.isKey(code, key.fullscreen)) {
            toggleFullscreen();
        }
        else if (basic.isKey(code, key.contrastDown)) {
            config.contrast--;
            config.contrast = range(config.contrast, 0, 300);
            updateVideoFilters();
            basic.addNotification("contrast: " + config.contrast, 1000, true, "contrast");
        }
        else if (basic.isKey(code, key.ContrastUp)) {
            config.contrast++;
            config.contrast = range(config.contrast, 0, 300);
            updateVideoFilters();
            basic.addNotification("contrast: " + config.contrast, 1000, true, "contrast");
        }
        else if (basic.isKey(code, key.contrastReset)) {
            config.contrast = 100;
            updateVideoFilters();
            basic.addNotification("contrast: " + config.contrast, 1000, true, "contrast");
        }
        else if (code == "KeyA") {
            config.grayscale--;
            config.grayscale = range(config.grayscale, 0, 100);
            updateVideoFilters();
            basic.addNotification("grayscale: " + config.grayscale, 1000, true, "grayscale");
        }
        else if (code == "KeyD") {
            config.grayscale++;
            config.grayscale = range(config.grayscale, 0, 100);
            updateVideoFilters();
            basic.addNotification("grayscale: " + config.grayscale, 1000, true, "grayscale");
        }
        else if (code == "KeyS") {
            config.grayscale = 0;
            updateVideoFilters();
            basic.addNotification("grayscale: " + config.grayscale, 1000, true, "grayscale");
        }
        else if (code == "KeyF") {
            config.hue--;
            config.hue = range(config.hue, -180, 180);
            updateVideoFilters();
            basic.addNotification("hue: " + config.hue, 1000, true, "hue");
        }
        else if (code == "KeyH") {
            config.hue++;
            config.hue = range(config.hue, -180, 180);
            updateVideoFilters();
            basic.addNotification("hue: " + config.hue, 1000, true, "hue");
        }
        else if (code == "KeyG") {
            config.hue = 0;
            updateVideoFilters();
            basic.addNotification("hue: " + config.hue, 1000, true, "hue");
        }
        else if (code == "KeyV") {
            config.blur--;
            config.blur = range(config.blur, 0, 40);
            updateVideoFilters();
            basic.addNotification("blur: " + config.blur, 1000, true, "blur");
        }
        else if (code == "KeyN") {
            config.blur++;
            config.blur = range(config.blur, 0, 40);
            updateVideoFilters();
            basic.addNotification("blur: " + config.blur, 1000, true, "blur");
        }
        else if (code == "KeyB") {
            config.blur = 0;
            updateVideoFilters();
            basic.addNotification("blur: " + config.blur, 1000, true, "blur");
        }
        else if (code == "") {
            config.brightness--;
            config.brightness = range(config.brightness, 0, 400);
            updateVideoFilters();
            basic.addNotification("brightness: " + config.brightness, 1000, true, "brightness");
        }
        else if (code == "") {
            config.brightness++;
            config.brightness = range(config.brightness, 0, 400);
            updateVideoFilters();
            basic.addNotification("brightness: " + config.brightness, 1000, true, "brightness");
        }
        else if (code == "") {
            config.brightness = 100;
            updateVideoFilters();
            basic.addNotification("brightness: " + config.brightness, 1000, true, "brightness");
        }
        else if (basic.isKey(code, key.invert)) {
            if(config.invert == 100)
            {
                config.invert = 0;
            }
            else
                config.invert = 100;
            updateVideoFilters();
            basic.addNotification("invert", 1000, true, "invert");
        }
    }

    if (basic.isKey(code, key.quit)) {
        quitCurrentAction();
    }
    
}

var constantForwarding = false;
var constantBackwarding = false;
const forwardingDelay = 300;
var constantForwardingTimeline = forwardingDelay;

var constantForwardingInterval;

function clearForwarding() {
    constantForwarding = false;
    constantBackwarding = false;
    clearInterval(constantForwardingInterval);
    constantForwardingTimeline = forwardingDelay;
}

forwardButton.onmouseup = clearForwarding;
backwardButton.onmouseup = clearForwarding;
forwardButton.onmouseleave = clearForwarding;
backwardButton.onmouseleave = clearForwarding;

function constantForwardingFunction(direction = 1) {
    constantForwardingTimeline -= tickRate;
    if (constantForwardingTimeline <= 0) {
        if (direction == 1) {
            forwardSeconds();
        }
        else if (direction == -1) {
            backwardSeconds();
        }
    }
}

forwardButton.onmousedown = function (event) {
    constantForwardingInterval = setInterval(function(){constantForwardingFunction(1)}, tickRate); 
}

backwardButton.onmousedown = function (event) {
    constantForwardingInterval = setInterval(function(){constantForwardingFunction(-1)}, tickRate); 
}

function pauseKeyControl(input = true) {
    pausingControl = input;
}

function setFullScreen() {
    const win = new BrowserWindow({ width: 800, height: 600 })
    var _window = electron.remote.getCurrentWindow();
    _window.setFullScreen(true);
  }

  function updateLastBarBounds(){
    if (topBar.display != "none" && topBar.getBoundingClientRect().height != 0)
        lastTopBarHeight = topBar.getBoundingClientRect().height;
    if (bottomBar.display != "none" && bottomBar.getBoundingClientRect().y != 0)
        lastBottomBarY = bottomBar.getBoundingClientRect().y;
}

function fullscreenUiCheck(e) {
    cursoHideTimer = 500;
    mainWin.style.cursor = "unset";
        if (fullScreenState) {

            if( (e.clientY > lastTopBarHeight+32) &&
                (e.clientY < lastBottomBarY-48)  &&
                e != null) {
                    topBar.style.display = "none" ;
                    bottomBar.style.display = "none" ;
                }
            else {
                topBar.style.display = "flex";
                bottomBar.style.display = "flex";
            }
            updateLastBarBounds();
        } else {
            topBar.style.display = "flex";
            bottomBar.style.display = "flex";
        }
}


const themeMenuLabel00 = new menu.listItem("label", false , "themes:");
const themeMenuItem00 = new menu.listItem("item", false, "dark [default]", "🌖", "click", function(){basic.setTheme("dark", config);}, undefined, "setThemeDark");
const themeMenuItem01 = new menu.listItem("item", false, "darker", "⚫", "click", function(){basic.setTheme("darker", config);}, undefined, "setThemeDarker");
const themeMenuItem02 = new menu.listItem("item", false, "light", "☀️", "click", function(){basic.setTheme("light", config);}, undefined, "setThemeLight");
const themeMenuLabel01 = new menu.listItem("label", false , "other");
const themeMenuItem03 = new menu.listItem("small item", false, "", "🌳", "click", function(){basic.setTheme("tree", config);}, undefined, "setThemeTree");
const themeMenuItem04 = new menu.listItem("small item", false, "", "🧀", "click", function(){basic.setTheme("cheese", config);}, undefined, "setThemeCheese");
const themeMenuItem05 = new menu.listItem("small item", false, "", "🫐", "click", function(){basic.setTheme("blueberry", config);}, undefined, "setThemeBlueberry");
const themeMenuItems = [themeMenuLabel00, themeMenuItem00, themeMenuItem01, themeMenuItem02,
                        themeMenuLabel01, themeMenuItem03, themeMenuItem04, themeMenuItem05];
const themeMenuList = new menu.listItem("item", true, "themes", "", "", undefined, themeMenuItems, "themeMenu");                        

const volumeMenu00 = new menu.listItem("label", false , "volume:");
const volumeMenu01 = new menu.listItem("item", false, "100", "%", "click", function(){setVolume(100)}, undefined, "setVolume100");
const volumeMenu02 = new menu.listItem("item", false, "75", "%", "click", function(){setVolume(75)}, undefined, "setVolume75");
const volumeMenu03 = new menu.listItem("item", false, "50", "%", "click", function(){setVolume(50)}, undefined, "setVolume50");
const volumeMenu04 = new menu.listItem("item", false, "25", "%", "click", function(){setVolume(25)}, undefined, "setVolume25");
const volumeMenu05 = new menu.listItem("item", false, "mute", "-", "click", toggleMute, undefined, "setVolumeMute");
const volumeMenuItems = [volumeMenu00, volumeMenu01,
                        volumeMenu02, volumeMenu03,
                        volumeMenu04, volumeMenu05];   
const volumeMenuList = new menu.listItem("item", true, "volume", "", "", undefined, volumeMenuItems, "volumeMenu");


function getPlayPauseState(){
    if(video.paused)
        return "play";
    return "pause";
}
const mainMenuButton00 = new menu.listItem("button", false, "", "--image:url(svg/previous.svg)", "click", function(){
    playPrevious();
}, themeMenuItems, "mainMenuPlayPrevious");
var mainMenuButton01 = new menu.listItem("button", false, "", `--image:url(svg/${getPlayPauseState()}.svg)`, "click", function(){
    switchPlayPause();
}, themeMenuItems, "mainMenuPlayPause");

function updateMainContextMenu() {
    // every item should be defined here
    // allso for other menus
    // all of them should have define functions
    // these functions shold be called from createGeneratedListMenu before anything
    // these functions should be passed to createGeneratedListMenu
}
const mainMenuButton02 = new menu.listItem("button", false, "", "--image:url(svg/next.svg)", "click", function(){
    playNext();
}, themeMenuItems, "mainMenuPlayNext");
var mainMenuButtonGroupItems = [mainMenuButton00, mainMenuButton01, mainMenuButton02];
var mainMenuButtonGroup01 = new menu.listItem("button group", false, "buttons", "--wrap: no-wrap;", "", undefined, mainMenuButtonGroupItems, "mainMenuButtonGroup");
const mainMenuLine00 = new menu.listItem("line", false, "", "", "", undefined, undefined, "");
const mainMenuItem00 = new menu.listItem("item", false, "themes", "🎨", "", undefined, themeMenuItems, "mainMenuThemes");
const mainMenuItem01 = new menu.listItem("item", false, "settings", "⚙️", "click", function() {
    openSettings();
}, undefined, "mainMenuSettings");
const mainMenuItems = [mainMenuButtonGroup01, mainMenuLine00, mainMenuItem00, mainMenuItem01];
const mainMenuList = new menu.listItem("item", true, "main", "", "", undefined, mainMenuItems, "mainMenu");

listen.addListener("mainCloseButton", "click", function() {
    safeClose();
});

listen.addListener("maximizeButton", "click", function() {
    ipcRenderer.send("toggleMaximize");
});

listen.addListener("minimizeButton", "click", function() {
    ipcRenderer.send("toggleMinimize");
});

listen.addListener("mainWin", "mousemove", function(e){
    fullscreenUiCheck(e);
}, ["!event"]);

listen.addListener("backwardButton", "click", function() {
    this.blur();
    backwardSeconds();
});

listen.addListener("playButton", "click", function() {
    this.blur();
    switchPlayPause();
});

navigator.mediaSession.setActionHandler('previoustrack', function() {
    playPrevious();
});

navigator.mediaSession.setActionHandler('nexttrack', function() {
    playNext();
});

listen.addListener("previousButton", "click", function() {
    playPrevious();
});

listen.addListener("nextButton", "click", function() {
    playNext();
});

listen.addListener("forwardButton", "click", function() {
    this.blur();
    forwardSeconds();
});

listen.addListener("timeInputForm", "submit", function() {
    setTimeFromInput();
});

listen.addListener("timerBarMiddle", "mousedown", function() {
    updateBar();
});

listen.addListener("mainWin", "drop", function(e) {
    loadVideoFromDrop(e);
}, ["!event"])

listen.addListener("fileAddressForm", "submit", function(e) {
    loadVideoFromInput();
}, ["!event"])


listen.addListener("fileSelectButton", "click", function(e) {
    barFileSelectInput.click();
    fileValueInterval = setInterval(function() {
        if (barFileSelectInput.value != "" && barFileSelectInput.value != null) {
            loadVideo(barFileSelectInput.files[0].path);
            barFileSelectInput.value = "";
            clearInterval(fileValueInterval);
        }
    }, tickRate);
}, ["!event"])


listen.addListener("timerBarMiddle", "mousemove", function(e) {
    updateTimeStamp(e);
}, ["!event"]);

listen.addListener("volumeController", "mousewheel", function(e) {
    setVolumeFromMouseWheel(e);
}, ["!event"]);

listen.addListener("volumeController", "contextmenu", function(e) {
    menu.createGeneratedListMenu(menu.generateListMenu(e, volumeMenuList, "volumeMenuList"));
}, ["!event"]);

listen.addListener("muteButton", "click", function() {
    toggleMute();
});

listen.addListener("volumeBarBg", "click", function(e) {
    setVolumeFromBar(e)
}, ["!event"]);

listen.addListener("volumeNumberInputForm", "submit", function() {
    setVolumeFromInput();
});

listen.addListener("mainPlayer", "mousewheel", function(e) {
    setVolumeFromMouseWheel(e);
}, ["!event"]);


listen.addListener("mainPlayer", "contextmenu", function(e) {
    // add update function to menu.createGeneratedListMenu
    menu.createGeneratedListMenu(menu.generateListMenu(e, mainMenuList, "mainMenuList"));
}, ["!event"]);

listen.addListener("mainPlayer", "dblclick", function(e) {
    switchPlayPause();
}, ["!event"]);

listen.addListener("mainPlayer", "mousedown", function(e) {
    if (e.button == 1) {
        toggleFullscreen(e);
    }
}, ["!event"]);

listen.addListener("themesButton", "click", function(e) {
    e.srcElement.blur();
    menu.createGeneratedListMenu(menu.generateListMenu(e, themeMenuList, "themeMenuList"));
}, ["!event"]);