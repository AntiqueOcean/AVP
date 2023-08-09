/* Copyright (C) 2023 antiqueOcean <antiqueocean.dev@gmail.com> - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential.
 */

/* ------------- --------- ------------- */
/* ------------- [Headers] ------------- */
/* ------------- --------- ------------- */
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
const config = _config[0];
const history = JSON.parse(fs.readFileSync(localPath + "/history.json"));
const key = JSON.parse(fs.readFileSync(localPath + "/input.json"))[0];

// input variables
var pausingControl = false;
var inputingTime = false;
var fileValueInterval;


// global ui variables
var tickRate = config.tick_rate; //ms
var isTempMenuOpen = false;
var previousTheme;
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

// notifications variables
var notficationsArray = new Array();
var lastNotficationId = 0;


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

var theme_items = `
<label>themes: </label>
<div style="--tag:'🌖'" onclick="setTheme('dark');">dark [default]</div>
<div style="--tag:'⚫'" onclick="setTheme('darker');">darker</div>
<div style="--tag:'☀️' " onclick="setTheme('light');">light</div>
<label>other</label>
<div class="small" style="--tag:'🌳'" onclick="setTheme('tree');"></div>
<div class="small" style="--tag:'🧀'" onclick="setTheme('cheese');"></div>
<div class="small" style="--tag:'🫐'" onclick="setTheme('blueberry');"></div>
`;

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
            ${theme_items}
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

/* ------------- ------------------------ ------------- */
/* ------------- [context menu functions] ------------- */
/* ------------- ------------------------ ------------- */

function generateContext_themes(){

}

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

function s(input) {
    return getComputedStyle(document.body).getPropertyValue(input);
}

function n(input) {
    var _str = getComputedStyle(document.body).getPropertyValue(input);
    var _out = parseInt(_str);
    return _out;
}

function range(input, _min, _max) {
    return Math.max(Math.min(input, _max), _min);
}

function init() {
    setVolume(config.volume);
    if (config.open_last) {
        loadVideo(config.last_path);
    }

    updateAll();
} 

function safeClose() {
    config.volume = Math.round(video.volume*100);
    if (video.readyState === 4)
        config.last_path = currentPath;
    updateConfigFile();
    addCurrentToHistory();
    updateHistoryFile();
    setInterval (() => {window.close();}, 250);
}

function toggleFullscreen(e){
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
        contextIsolation: false,
        enableRemoteModule: true
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

function closeTempMenu() {
    window.removeEventListener("click", closeTempMenu);
    window.removeEventListener("contextmenu", closeTempMenu);
    document.getElementById("currentTempMenu").innerHTML = '';
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

function setBoundingVariables(elem) {
    var selfB = elem.getBoundingClientRect();
    var parentB = elem.parentElement.getBoundingClientRect();
    elem.style.setProperty('--var-x', selfB.x + 'px');
    elem.style.setProperty('--var-y', selfB.y + 'px');
    elem.style.setProperty('--var-w', selfB.width + 'px');
    elem.style.setProperty('--var-h', selfB.height + 'px');
    elem.style.setProperty('--var-local-x', (selfB.x - parentB.x) + 'px');
    elem.style.setProperty('--var-local-y', (selfB.y - parentB.y) + 'px');
    var temp = parseInt(elem.style.getPropertyValue('--var-w')) + parseInt(elem.style.getPropertyValue('--var-local-x'));
}

function addTempMenu(event, type, id, items) {
    closeTempMenu();
    var header;
    var code;
    if (type == "list-menu") {
        header = `<div class="list-menu" id = ${id} style="--mouse-x: ${event.clientX}px; --mouse-y: ${event.clientY}px;">`;
    }
    code = header + items + "</div>";
    document.getElementById("currentTempMenu").innerHTML = code;
    setTimeout(() => {
        window.addEventListener("click", closeTempMenu);
        window.addEventListener("contextmenu", closeTempMenu);
    }, 50);
}

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

function updateConfigFile() {
    var _str = "[" + JSON.stringify(config) + ",{}]";
    for (var i = 0; i < _str.length; i++) {
        if (_str[i] == "," || _str[i] == "{") {
            _str = _str.slice(0, i+1) + "\n" + _str.slice(i+1);
            i++;
        }
    }

    fs.writeFile(localPath + "/config.json", _str, (error) => {
        if(error) {
            console.error(error);
            throw error;
        }
    });
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

function setTheme(input, notify = true) {
    previousTheme = config.theme;
    var current = document.documentElement.getAttribute('class');
    current = current.split(" ");
    current[0] = 'theme-'+input;
    current = current.join(" ");
    document.documentElement.setAttribute('class', current);

    config.theme = input;
    updateConfigFile();
    if (notify)
        addNotification("🖌️ " + input + " theme, <u>click to undo</u>", 8000, true, "themeChanged", undefined, `onclick="setTheme('` + previousTheme + `')"`);
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

function removeInnerOfIndex(input, index) {
    var elem = getFromIndex (input, index);
    elem.innerHTML = "";
}


function windowQuit() {
    window.close();
  }
  
  
function calcSeconds(input) {
    const date = new Date(null);
    date.setSeconds(input);
    return date.toISOString().slice(11, 19);
}
  
function convertToSeconds(input) {
    var a = input.split(":");
    if (a.length == 3)
        return (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); 
    else
        return currentTime;
}
  
function updateNavigator() {
    navigator.mediaSession.metadata = new MediaMetadata({
        title: path.parse(video.getAttribute("src")).base,
        artist: video.artist,
        album: video.album
      });
}

function updateUi() {
    setTheme(config.theme, false);
    fileTitle.value = path.parse(currentPath).base;
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
        timeInput.value = calcSeconds(currentTime);
    timerBarMiddleBar.style.width = (currentTime/currentDuration*100)+'%';
    if (input)
      timerBarRight.innerHTML = calcSeconds(currentDuration);
}
  
function updateTimeStamp(event) {
    timebarMouseX = event.clientX;
    var leftPos = timerBarMiddle.getBoundingClientRect().left + window.scrollX;
    timeStamp.style.left = (timebarMouseX-leftPos-(timeStamp.getBoundingClientRect().width / 2))+'px';
    timeStamp.innerHTML = calcSeconds(((timebarMouseX-leftPos) / timerBarMiddle.getBoundingClientRect().width) * (currentDuration)) + ' [' + (Math.round(((((timebarMouseX-leftPos) / timerBarMiddle.getBoundingClientRect().width) * (currentDuration)/currentDuration*100)) * 10)/10).toFixed(1)+'%]'; 
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
    handleNotifications(tickRate);
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
         addNotification(path.parse(currentPath).base, 8000, true, "videoTitle", undefined, `onclick="removeNotificationById(this.id);"`);
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
    video.play();
    addNotification("⏯️ Playing", 1000, true, "playState", "var(--alt-color-green)",  `onclick="removeNotificationById(this.id)"`);
}

function forcePause() {
    video.pause();
    addNotification("⏯️ Paused", 1000, true, "playState", "var(--alt-color-red)",  `onclick="removeNotificationById(this.id)"`);
}
function forwardSeconds(_sec = forwardingSeconds) {
    setNewTime(currentTime+_sec);
    var _out = "> +" + _sec + "s";
    addNotification(_out, 1500, true, "forwardbackward", undefined,  `onclick="removeNotificationById(this.id)"`);
}

function backwardSeconds(_sec = forwardingSeconds) {
    setNewTime(currentTime-_sec);
    var _out = "< -" + _sec + "s";
    addNotification(_out, 1500, true, "forwardbackward", undefined,  `onclick="removeNotificationById(this.id)"`);
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
        addNotification("🔈" + Math.round(_input) + "%", 1000, true, "volumechange");
    else {
        addNotification("🔇 Muted", 4000, true, "mute", undefined, `onclick="toggleMute(); removeNotificationById(this.id);"`);
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

/* ***** [Functions] **** */
/* Notification Functions */

function addNotification(input, duration, unique = false, _name = "none", color = "var(--notification-text-color)", _additional) {
    var _code;
    if (unique)
        _code = `<button id="notif_` + _name + `" tabindex="-1" style="--animation-duration: ${duration/1000}s; --text-color: ${color};" ` + _additional + `>` + input + `</button>`;
    else
        _code = `<button id="notif_` + lastNotficationId + `" tabindex="-1" style="--animation-duration: ${duration/1000}s; --text-color: ${color};" ` + _additional + `>` + input + `</button>`;

    var _index = notficationsArray.length;
    if (!unique) {
        for (var i = 0; i < notficationsArray.length; i++) {
            if (notficationsArray[i][0] === "removed") {
                _index = i;
                break;
            }
        }
        notficationsArray[_index] = new Array("notif_" + lastNotficationId, duration);
    }
    else {
        for (var i = 0; i < notficationsArray.length; i++) {
            if (notficationsArray[i][0] === "notif_" + _name) {
                _index = i;
                removeNotificationById(notficationsArray[i][0]);
                break;
            } else if (notficationsArray[i][0] === "removed") {
                _index = i;
            }
        }
        notficationsArray[_index] = new Array("notif_" + _name, duration);
    }
    notifications.insertAdjacentHTML('beforeend', _code);
    lastNotficationId++;
}

function removeNotification(index) {
    document.getElementById(notficationsArray[index][0]).remove();
    notficationsArray[index][0] = "removed";
}

function removeNotificationById(_id) {
    for (var i = 0; i < notficationsArray.length; i++) {
        if (notficationsArray[i][0] === _id) {
            document.getElementById(notficationsArray[i][0]).remove();
            notficationsArray[i][0] = "removed";
        }
    }
}

function handleNotifications(deltaTime) {
    var allRemoved = true;
    for (var i = 0; i < notficationsArray.length; i++)
    {
        if (notficationsArray[i][0] != "removed") {
            if (!document.getElementById(notficationsArray[i][0]).matches(':hover')) {
                notficationsArray[i][1] -= deltaTime;
                document.getElementById(notficationsArray[i][0]).style.setProperty("--anim-state", "running");
            } else {
                document.getElementById(notficationsArray[i][0]).style.setProperty("--anim-state", "paused");
            }
            if (notficationsArray[i][1] <= 0)
                removeNotification(i);
            allRemoved = false;
        }
    }
    if (allRemoved)
       notficationsArray = [];
}

/* ****** [Functions] ******* */
/* Subtitle Control Functions */

function toggleSubtitle() {
    alert(video.textTracks.length);
}

/* ***** [Functions + Events] ***** */
/* *** Keyboard Input Functions *** */

function isKey(input, _arr) {
    if (_arr != null)
    for (var i = 0; i < _arr.length; i++) {
        if (input == _arr[i])
            return true;
    }
    return false;
}

window.onkeydown = function(event) {
    var code = event.code;
    if (!pausingControl) {
        console.log(event.code);
        closeTempMenu();
        if (isKey(code, key.play)) {
            switchPlayPause();
            closeTempMenu();
        }
        else if (isKey(code, key.forward)) {
            forwardSeconds();
        }
        else if (isKey(code, key.backward)) {
            backwardSeconds();
        }
        else if (isKey(code, key.volumeUp)) {
            setVolume(video.volume*100+2);
        }
        else if (isKey(code, key.volumeDown)) {
            setVolume(video.volume*100-2);
        }
        else if (isKey(code, key.mute)) {
            toggleMute();
        }
        else if (isKey(code, key.fullscreen)) {
            toggleFullscreen();
        }
        else if (isKey(code, key.contrastDown)) {
            config.contrast--;
            config.contrast = range(config.contrast, 0, 300);
            updateVideoFilters();
            addNotification("contrast: " + config.contrast, 1000, true, "contrast");
        }
        else if (isKey(code, key.ContrastUp)) {
            config.contrast++;
            config.contrast = range(config.contrast, 0, 300);
            updateVideoFilters();
            addNotification("contrast: " + config.contrast, 1000, true, "contrast");
        }
        else if (isKey(code, key.contrastReset)) {
            config.contrast = 100;
            updateVideoFilters();
            addNotification("contrast: " + config.contrast, 1000, true, "contrast");
        }
        else if (code == "KeyA") {
            config.grayscale--;
            config.grayscale = range(config.grayscale, 0, 100);
            updateVideoFilters();
            addNotification("grayscale: " + config.grayscale, 1000, true, "grayscale");
        }
        else if (code == "KeyD") {
            config.grayscale++;
            config.grayscale = range(config.grayscale, 0, 100);
            updateVideoFilters();
            addNotification("grayscale: " + config.grayscale, 1000, true, "grayscale");
        }
        else if (code == "KeyS") {
            config.grayscale = 0;
            updateVideoFilters();
            addNotification("grayscale: " + config.grayscale, 1000, true, "grayscale");
        }
        else if (code == "KeyF") {
            config.hue--;
            config.hue = range(config.hue, -180, 180);
            updateVideoFilters();
            addNotification("hue: " + config.hue, 1000, true, "hue");
        }
        else if (code == "KeyH") {
            config.hue++;
            config.hue = range(config.hue, -180, 180);
            updateVideoFilters();
            addNotification("hue: " + config.hue, 1000, true, "hue");
        }
        else if (code == "KeyG") {
            config.hue = 0;
            updateVideoFilters();
            addNotification("hue: " + config.hue, 1000, true, "hue");
        }
        else if (code == "KeyV") {
            config.blur--;
            config.blur = range(config.blur, 0, 40);
            updateVideoFilters();
            addNotification("blur: " + config.blur, 1000, true, "blur");
        }
        else if (code == "KeyN") {
            config.blur++;
            config.blur = range(config.blur, 0, 40);
            updateVideoFilters();
            addNotification("blur: " + config.blur, 1000, true, "blur");
        }
        else if (code == "KeyB") {
            config.blur = 0;
            updateVideoFilters();
            addNotification("blur: " + config.blur, 1000, true, "blur");
        }
        else if (code == "") {
            config.brightness--;
            config.brightness = range(config.brightness, 0, 400);
            updateVideoFilters();
            addNotification("brightness: " + config.brightness, 1000, true, "brightness");
        }
        else if (code == "") {
            config.brightness++;
            config.brightness = range(config.brightness, 0, 400);
            updateVideoFilters();
            addNotification("brightness: " + config.brightness, 1000, true, "brightness");
        }
        else if (code == "") {
            config.brightness = 100;
            updateVideoFilters();
            addNotification("brightness: " + config.brightness, 1000, true, "brightness");
        }
        else if (isKey(code, key.invert)) {
            if(config.invert == 100)
            {
                config.invert = 0;
            }
            else
                config.invert = 100;
            updateVideoFilters();
            addNotification("invert", 1000, true, "invert");
        }
    }

    if (isKey(code, key.quit)) {
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

  function addListener(_id, _action, _function, _pass = []) {
    const _element = document.getElementById(_id);

        var _code = "";
        if(_pass.length == 0) {
            _code = `_element.addEventListener(_action, _function);`;
            eval(_code);
        }
        else {
            _code = `_element.addEventListener(_action, function(_e = this) {_function(`;
            for (var i = 0; i < _pass.length; i++) {
                if (i != _pass.length-1)
                    _code += `getArg(_e, _pass, ${i}),`;
                else
                    _code += `getArg(_e, _pass, ${i}))});`;
            }
        }
        eval(_code);
  }

  function getArg(_event, _array, _index) {
    if (_array[_index] == "!event") {
        return _event;
    }
    else {
        return _array[_index];
    }
  }


  class listItem {
    constructor(type, isMain, name, sign = "", input = "", func = null, children = [], id = "") {
        this.name = name;
        this.type = type;
        this.sign = sign;
        this.input = input;
        this.func = func;
        this.id = id;
        this.children = children;
        this.isParent = false;
        if (children.length != 0) 
            this.isParent = true;
        this.isMain = isMain;
    }
};

const themeMenuLabel00 = new listItem("label", false , "themes:");
const themeMenuItem00 = new listItem("item", false, "dark [default]", "🌖", "click", function(){setTheme("dark");}, undefined, "setThemeDark");
const themeMenuItem01 = new listItem("item", false, "darker", "⚫", "click", function(){setTheme("darker");}, undefined, "setThemeDarker");
const themeMenuItem02 = new listItem("item", false, "light", "☀️", "click", function(){setTheme("light");}, undefined, "setThemeLight");
const themeMenuLabel01 = new listItem("label", false , "other");
const themeMenuItem03 = new listItem("small item", false, "", "🌳", "click", function(){setTheme("tree");}, undefined, "setThemeTree");
const themeMenuItem04 = new listItem("small item", false, "", "🧀", "click", function(){setTheme("cheese");}, undefined, "setThemeCheese");
const themeMenuItem05 = new listItem("small item", false, "", "🫐", "click", function(){setTheme("blueberry");}, undefined, "setThemeBlueberry");
const themeMenuItems = [themeMenuLabel00, themeMenuItem00, themeMenuItem01, themeMenuItem02,
                        themeMenuLabel01, themeMenuItem03, themeMenuItem04, themeMenuItem05];
const themeMenuList = new listItem("item", true, "themes", "", "", undefined, themeMenuItems, "themeMenu");                        

const volumeMenu00 = new listItem("label", false , "volume:");
const volumeMenu01 = new listItem("item", false, "100", "%", "click", function(){setVolume(100)}, undefined, "setVolume100");
const volumeMenu02 = new listItem("item", false, "75", "%", "click", function(){setVolume(75)}, undefined, "setVolume75");
const volumeMenu03 = new listItem("item", false, "50", "%", "click", function(){setVolume(50)}, undefined, "setVolume50");
const volumeMenu04 = new listItem("item", false, "25", "%", "click", function(){setVolume(25)}, undefined, "setVolume25");
const volumeMenu05 = new listItem("item", false, "mute", "-", "click", toggleMute, undefined, "setVolumeMute");
const volumeMenuItems = [volumeMenu00, volumeMenu01,
                        volumeMenu02, volumeMenu03,
                        volumeMenu04, volumeMenu05];   
const volumeMenuList = new listItem("item", true, "volume", "", "", undefined, volumeMenuItems, "volumeMenu");


const mainMenu00_00 = new listItem("item", false, "test00-00", "?", undefined, null, undefined, "testMenuItem00_00");
const mainMenu00_01 = new listItem("item", false, "test00-01", "?", undefined, null, undefined, "testMenuItem00_01");
const mainMenuItem00Items = [mainMenu00_00, mainMenu00_01];
const mainMenuItem00 = new listItem("item", false, "themes", "🎨", "", undefined, themeMenuItems, "mainMenuThemes");
const mainMenuItem01 = new listItem("item", false, "test01", "?", undefined, null, undefined, "testMenuItem01");
const mainMenuItems = [mainMenuItem00, mainMenuItem01];
const mainMenuList = new listItem("item", true, "main", "", "", undefined, mainMenuItems, "mainMenu");

addListener("mainCloseButton", "click", function() {
    safeClose();
});

addListener("maximizeButton", "click", function() {
    ipcRenderer.send("toggleMaximize");
});

addListener("minimizeButton", "click", function() {
    ipcRenderer.send("toggleMinimize");
});

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
addListener("mainWin", "mousemove", function(e){
    fullscreenUiCheck(e);
}, ["!event"]);

addListener("backwardButton", "click", function() {
    this.blur();
    backwardSeconds();
});

addListener("playButton", "click", function() {
    this.blur();
    switchPlayPause();
});

navigator.mediaSession.setActionHandler('previoustrack', function() {
    playPrevious();
});

navigator.mediaSession.setActionHandler('nexttrack', function() {
    playNext();
});

addListener("previousButton", "click", function() {
    playPrevious();
});

addListener("nextButton", "click", function() {
    playNext();
});

addListener("forwardButton", "click", function() {
    this.blur();
    forwardSeconds();
});

addListener("timeInputForm", "submit", function() {
    setTimeFromInput();
});

addListener("timerBarMiddle", "mousedown", function() {
    updateBar();
});

addListener("mainWin", "drop", function(e) {
    loadVideoFromDrop(e);
}, ["!event"])

addListener("fileAddressForm", "submit", function(e) {
    loadVideoFromInput();
}, ["!event"])


addListener("fileSelectButton", "click", function(e) {
    barFileSelectInput.click();
    fileValueInterval = setInterval(function() {
        if (barFileSelectInput.value != "" && barFileSelectInput.value != null) {
            loadVideo(barFileSelectInput.files[0].path);
            barFileSelectInput.value = "";
            clearInterval(fileValueInterval);
        }
    }, tickRate);
}, ["!event"])


addListener("timerBarMiddle", "mousemove", function(e) {
    updateTimeStamp(e);
}, ["!event"]);

addListener("volumeController", "mousewheel", function(e) {
    setVolumeFromMouseWheel(e);
}, ["!event"]);

addListener("volumeController", "contextmenu", function(e) {
    createGeneratedListMenu(generateListMenu(e, volumeMenuList, "volumeMenuList"));
}, ["!event"]);

addListener("muteButton", "click", function() {
    toggleMute();
});

addListener("volumeBarBg", "click", function(e) {
    setVolumeFromBar(e)
}, ["!event"]);

addListener("volumeNumberInputForm", "submit", function() {
    setVolumeFromInput();
});

addListener("mainPlayer", "mousewheel", function(e) {
    setVolumeFromMouseWheel(e);
}, ["!event"]);


addListener("mainPlayer", "contextmenu", function(e) {
    createGeneratedListMenu(generateListMenu(e, mainMenuList, "mainMenuList"));
}, ["!event"]);

addListener("mainPlayer", "dblclick", function(e) {
    switchPlayPause();
}, ["!event"]);

addListener("mainPlayer", "mousedown", function(e) {
    if (e.button == 1) {
        toggleFullscreen(e);
    }
}, ["!event"]);

addListener("themesButton", "click", function(e) {
    e.srcElement.blur();
    createGeneratedListMenu(generateListMenu(e, themeMenuList, "themeMenuList"));
}, ["!event"]);


function elementValidateById(_id, _func, _interval = 10) {
    const _tempInterval = setInterval (function(){
        const _elem = document.getElementById(_id);
        if (_elem != null & _elem != "undefined"){
        _func();
        clearInterval(_tempInterval);
        }
    }, _interval);
}


function generateListMenu(_event, itemList, _id = "", isMain = true) {
    var _items = [];
    const _list = itemList.children;
    var _result = "";
    if (isMain)
        _result = `<div class="list-menu" id="${_id}" style="--mouse-x: ${_event.clientX}px; --mouse-y: ${_event.clientY}px;">`;
    else
        _result = `<div class="list-menu child">`;

    for(var i = 0; i < _list.length; i++) {
        if (_list[i].type == "label") {
            _items[i] = `<label>${_list[i].name}</label>`;
        }
        else if (_list[i].type == "item" || _list[i].type == "small item") {
            var _class = "";
            if (_list[i].type == "small item")
                _class = `class="small"`;
            if (_list[i].isParent)
                _class = `class="parent"`;
            var __id = "";
            if (_list[i].id != "")
                __id = `id="${_list[i].id}"`;
            _items[i] = `<div ${__id} ${_class} style="--tag:'${_list[i].sign}'">${_list[i].name} `;
            const _event_ = _event;
            const listItem = _list[i];
            if (_list[i].children.length != 0) {
                _items[i] += generateListMenu(_event_, listItem, listItem.id + "_menu", false);

            elementValidateById(listItem.id, () => {
                addListener(listItem.id, "mouseover", setBoundingVariables(document.getElementById(listItem.id)));
            });
                    
            }
            if (_list[i].func != null) {
                elementValidateById(listItem.id, () => {
                    addListener(listItem.id, listItem.input, listItem.func);
                });
                
            }
            
            _items[i] += `</div>`;
        }
    }

    for (var i = 0; i < _items.length; i++) {
        _result += _items[i];
    }
    _result += `</div>`;
    return _result;
}

function createGeneratedListMenu(input) {
    closeTempMenu();

    document.getElementById("currentTempMenu").innerHTML = input;
    setTimeout(() => {
        window.addEventListener("click", closeTempMenu);
        window.addEventListener("contextmenu", closeTempMenu);
    }, 50);
}

