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

var previewGenerationProcess;

// input variables
var pausingControl = false;
var inputingTime = false;
var fileValueInterval;


// global ui variables
var tickRate = config.tick_rate; //ms
var isTempMenuOpen = false;
var isPreviewReady = false;
var previewArray = [];
var previewArrayLength = 0;


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
var replay = config.replay;

//Audio control variables
var lastVolume = 25;
var audioCheck = 2000;
var autoSync = config.autoSync;
var syncAmount = 0.15;

//play control
const currentPlayData = new basic.playData;

//windows
var settingsWindow;


//ffmpeg variables
var killFfmpeg = false;

/* ------------- ---------- ------------- */
/* ------------- [Elements] ------------- */
/* ------------- ---------- ------------- */

// video control elements
var mainPlayer = document.getElementById("mainPlayer");
var video = document.getElementById("video");
var timeStamp = document.getElementById("timeStamp"); 
var previewImage = document.getElementById("preview"); 
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

//Audio control elements
var audio = document.getElementById("audio");
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
    audio.controls = false;
    video.muted = true;
    if (config.open_last) {
        loadVideo(config.last_path);
    }
    // temp
    if (!config.temp_popup)
        document.getElementById("donationPopUp").style.display = "none";
    
    updateAll();
} 

function safeClose() {
    config.volume = Math.round(audio.volume*100);
    if (video.readyState == 4)
        config.last_path = currentPath;
    addCurrentToHistory();
    updateHistoryFile();
    basic.updateConfigFile(config);
    if (previewGenerationProcess != null)
        previewGenerationProcess.kill();
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


function setPlayData(input) {
    const _stat = fs.statSync(input);
    currentPlayData.video = new basic.videoData(path.parse(input).name, video.duration, input, path.extname(input), getFromHistory(input), video.videoWidth, video.videoHeight, 128, 30, _stat.size, "none");
    currentPlayData.audio = [];
    for (var i = 0; i < video.audioTracks.length; i++) {
        currentPlayData.audio[i] = new basic.audioData(video.audioTracks[i].label, video.audioTracks[i].kind, 128, video.audioTracks[i].language, video.audioTracks[i].enabled);
    }
    alert(currentPlayData.audio);
}

function refreshDirectory() {
    if (currentDirectory != lastDirectory) {
        fileList = [];
        lastDirectory = currentDirectory;
        fs.readdir(currentDirectory, function(err, _files) {
            if(!err) {
                _files.forEach(_file => {
                    if (_file && basic.isOfType(path.extname(_file).slice(1)))
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
    if (config.showPreview) {
        previewImage.display = "block";
    }
    else {
        previewImage.display = "none";
    }
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
    audio.currentTime = settingTime;
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
    const _percent_ = (Math.round(((((timebarMouseX-leftPos) / timerBarMiddle.getBoundingClientRect().width) * (currentDuration)/currentDuration*100)) * 10)/10).toFixed(1);
    timeStamp.innerHTML = basic.calcSeconds(((timebarMouseX-leftPos) / timerBarMiddle.getBoundingClientRect().width) * (currentDuration)) + ' [' + _percent_ +'%]';
    if (config.showPreview) {
        previewImage.style.setProperty("--position-y" , timeStamp.getBoundingClientRect().top - previewImage.getBoundingClientRect().height - 8 + "px");
        previewImage.style.setProperty("--position-x" , timebarMouseX - previewImage.getBoundingClientRect().width/2 + "px");
        //if(isPreviewReady)
        previewImage.setAttribute('src', getPreviewByPercent(_percent_));
    }
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
    if (video.currentTime >= video.duration - 0.25) {
        if (replay) {
            setNewTime(0);
            forcePlay();
        }
        else if (config.autoPlayNext)
            playNext(true);
    }
    audioCheck -= tickRate;
    if(autoSync)
    if ((audioCheck <= 0) && (video.currentTime - audio.currentTime + (config.audioDelayAmount/1000) >= syncAmount)) {
        syncAudio();
        console.log("synced");
        audioCheck = 2000;
    }

}

function generatePreview(input){
    if (previewGenerationProcess != null)
        previewGenerationProcess.kill();
    if (config.showPreview) {
    isPreviewReady = false;
    const previewStep = 0.05;
    previewArrayLength = Math.round(video.duration * previewStep);
    previewImage.setAttribute ("src", "Styles/images/loadingPreview.jpg");
    fs.readdir(localPath + "/preview", (err, files) => {
      
        for (const file of files) {
          fs.unlink(path.join(localPath + "/preview", file), (err) => {
            if (err) throw err;
          });
        }
      });
      previewGenerationProcess = basic.ffmpeg().input(input).outputOption('-r', previewStep).saveToFile(localPath + '/preview/%003d.jpg').on('progress', function(progress){
        fs.readdir(localPath + "/preview", function(err, _files) {
            if(!err) {
                previewArray = [];
                _files.forEach(_file => {
                    if (_file)
                        previewArray.push(localPath + "/preview/" + _file);
                });
                isPreviewReady = true;
            }
            else 
                isPreviewReady = false;
        });


    });
  
}
}

var updateBarMouseUpInterval;
function updateBar() {
        window.addEventListener("mouseup", setNewTimeEnd);
        updateBarMouseUpInterval = setInterval(setNewTime, 25); 
}

function setNewTimeEnd(){
    clearInterval(updateBarMouseUpInterval);
    window.removeEventListener("mouseup", setNewTimeEnd);
}



/* ***** [Functions] ***** */
/* Video Control Functions */

const videoJsConfig = {
    controls: true,
    autoplay: false,
    preload: 'auto',
    fluid: true,
    height: 600,
    width: 800,
  
    textTrackSettings: true
  
    // html5: {
    //   nativeTextTracks: false
    // }
    };

function getPreviewByPercent(input) {
    const _file = previewArray[Math.round(previewArrayLength/100*input)];
    if (fs.existsSync(_file)) 
        return _file;
    else {
        console.log(Math.round(previewArrayLength/100*input));
        return "Styles/images/loadingPreview.jpg";

    }
}

function loadVideo(input, reset_current = false) {
    if (basic.isOfType(path.extname(input).slice(1))) {
        if(video.readyState === 4) {
            addCurrentToHistory(!reset_current);
        }
        
        video.setAttribute("src", input);
        audio.setAttribute("src", input);
        
        video.onloadeddata = function() {
            
            if (config.open_as_left) {
                const _time_ = getFromHistory(input);
                //if (_time_ >= (video.duration - 0.25))
                    setNewTime(_time_);
            }
            currentPath = input;
            currentDirectory = path.parse(currentPath).dir;
            refreshDirectory();
            if (config.autoPlay) {
                forcePlay();
            }
            if(video.readyState === 4) {
                basic.addNotification(path.parse(currentPath).base, 8000, true, "videoTitle", undefined, `onclick="removeNotificationById(this.id);"`);
            }


            //setPlayData(input);
            console.log(video.videoHeight);
            const _newHeight = topBar.getBoundingClientRect().height + bottomBar.getBoundingClientRect().height + basic.range(video.videoHeight, 0, window.screen.height-40);
            ipcRenderer.invoke("setWindowSize", basic.range(video.videoWidth, 0, window.screen.width-80), _newHeight);
            generatePreview(input);
            updateAll();
        }



    }
}

function addCurrentToHistory(add_as_is = true) {
    if (video.readyState === 4 && config.open_as_left) {
        var _exists = false;
        var _time = 0;
        if (add_as_is && video.currentTime < video.duration - 10)
            _time = video.currentTime;
        for (var i = 0; i < history.length; i++) {
            if (currentPath == history[i].path) {
                history[i].last = _time;
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
        audio.play();
        audio.currentTime = video.currentTime + (config.audioDelayAmount/1000);
    if (video.readyState == 4) {
        basic.addNotification("⏯️ Playing", 1000, true, "playState", "var(--alt-color-green)",  `onclick="removeNotificationById(this.id)"`);
    }
}

function forcePause() {
    if (video.readyState == 4) {
        video.pause();
        audio.pause();
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

function playNext(reset_current = false) {
    const _index = fileList.indexOf(currentPath) + 1;
    if (_index < fileList.length)
        loadVideo(fileList[_index], reset_current);
    else 
        loadVideo(fileList[0], reset_current);
}

function playPrevious() {
    const _index = fileList.indexOf(currentPath) - 1;
    if (_index >= 0)
        loadVideo(fileList[_index]);
    else 
        loadVideo(fileList[fileList.length-1]);
}

/* ****** [Functions] ***** */
/* Audio Control Functions */

function syncAudio() {
    audio.currentTime = video.currentTime + (config.audioDelayAmount/1000);
}
function updateVolumeUi(){
    volumeBar.style.width = (audio.volume*100) + "%";
    volumeNumberInput.value = Math.round(audio.volume * 100);
    if (audio.volume == 0) 
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
    audio.volume = _input/100;
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
        lastVolume = Math.round(audio.volume * 100);
    }
    else if (width > 90)
        width = 100;
    setVolume(width);
}

function setVolumeFromMouseWheel(event) {
    var _amount = 2;
    var _direction = -1;
    var _current = audio.volume;
    if (event.deltaY < 0)
    _direction = 1;
    setVolume((_current * 100)+(_amount*_direction));
}

function setVolumeFromInput() {
    setVolume(volumeNumberInput.value);
}


function toggleMute(){
    if (audio.volume === 0 && lastVolume != 0)
        setVolume(lastVolume);
    else if (audio.volume == 0 && lastVolume == 0)
        setVolume(25);
    else {
        lastVolume = Math.round(audio.volume * 100);
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
            setVolume(audio.volume*100+2);
        }
        else if (basic.isKey(code, key.volumeDown)) {
            setVolume(audio.volume*100-2);
        }
        else if (basic.isKey(code, key.mute)) {
            toggleMute();
        }
        else if (basic.isKey(code, key.fullscreen)) {
            toggleFullscreen();
        }
        else if (basic.isKey(code, key.contrastDown)) {
            config.contrast--;
            config.contrast = basic.range(config.contrast, 0, 300);
            updateVideoFilters();
            basic.addNotification("contrast: " + config.contrast, 1000, true, "contrast");
        }
        else if (basic.isKey(code, key.contrastUp)) {
            config.contrast++;
            config.contrast = basic.range(config.contrast, 0, 300);
            updateVideoFilters();
            basic.addNotification("contrast: " + config.contrast, 1000, true, "contrast");
        }
        else if (basic.isKey(code, key.contrastReset)) {
            config.contrast = 100;
            updateVideoFilters();
            basic.addNotification("contrast: " + config.contrast, 1000, true, "contrast");
        }
        else if (basic.isKey(code, key.grayDown)) {
            config.grayscale--;
            config.grayscale = basic.range(config.grayscale, 0, 100);
            updateVideoFilters();
            basic.addNotification("grayscale: " + config.grayscale, 1000, true, "grayscale");
        }
        else if (basic.isKey(code, key.grayUp)) {
            config.grayscale++;
            config.grayscale = basic.range(config.grayscale, 0, 100);
            updateVideoFilters();
            basic.addNotification("grayscale: " + config.grayscale, 1000, true, "grayscale");
        }
        else if (basic.isKey(code, key.grayReset)) {
            config.grayscale = 0;
            updateVideoFilters();
            basic.addNotification("grayscale: " + config.grayscale, 1000, true, "grayscale");
        }
        else if (basic.isKey(code, key.hueDown)) {
            config.hue--;
            config.hue = basic.range(config.hue, -180, 180);
            updateVideoFilters();
            basic.addNotification("hue: " + config.hue, 1000, true, "hue");
        }
        else if (basic.isKey(code, key.hueUp)) {
            config.hue++;
            config.hue = basic.range(config.hue, -180, 180);
            updateVideoFilters();
            basic.addNotification("hue: " + config.hue, 1000, true, "hue");
        }
        else if (basic.isKey(code, key.hueReset)) {
            config.hue = 0;
            updateVideoFilters();
            basic.addNotification("hue: " + config.hue, 1000, true, "hue");
        }
        else if (basic.isKey(code, key.blurDown)) {
            config.blur--;
            config.blur = basic.range(config.blur, 0, 40);
            updateVideoFilters();
            basic.addNotification("blur: " + config.blur, 1000, true, "blur");
        }
        else if (basic.isKey(code, key.blurUp)) {
            config.blur++;
            config.blur = basic.range(config.blur, 0, 40);
            updateVideoFilters();
            basic.addNotification("blur: " + config.blur, 1000, true, "blur");
        }
        else if (basic.isKey(code, key.blurReset)) {
            config.blur = 0;
            updateVideoFilters();
            basic.addNotification("blur: " + config.blur, 1000, true, "blur");
        }
        else if (basic.isKey(code, key.brightnessDown)) {
            config.brightness--;
            config.brightness = basic.range(config.brightness, 0, 400);
            updateVideoFilters();
            basic.addNotification("brightness: " + config.brightness, 1000, true, "brightness");
        }
        else if (basic.isKey(code, key.brightnessUp)) {
            config.brightness++;
            config.brightness = basic.range(config.brightness, 0, 400);
            updateVideoFilters();
            basic.addNotification("brightness: " + config.brightness, 1000, true, "brightness");
        }
        else if (basic.isKey(code, key.brightnessReset)) {
            config.brightness = 100;
            updateVideoFilters();
            basic.addNotification("brightness: " + config.brightness, 1000, true, "brightness");
        }
        else if (basic.isKey(code, key.invert)) {
            if(config.invert == 100)
                config.invert = 0;
            else
                config.invert = 100;
            updateVideoFilters();
            basic.addNotification("invert", 1000, true, "invert");
        }
        else if (basic.isKey(code, key.delayAudioBackward)) {
            config.audioDelayAmount -= config.audioDelayAddingAmount;
            syncAudio();
            if (config.audioDelayAmount == 0)
                audio.currentTime = video.currentTime ;
            basic.addNotification("Audio Delay: " + config.audioDelayAmount , 1000, true, "audioDelay");
        }
        else if (basic.isKey(code, key.delayAudioForward)) {
            config.audioDelayAmount += config.audioDelayAddingAmount;
            syncAudio();
            if (config.audioDelayAmount == 0)
                audio.currentTime = video.currentTime ;
            basic.addNotification("Audio Delay: " + config.audioDelayAmount , 1000, true, "audioDelay");
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

var themeMenuLabel00;
var themeMenuItem00;
var themeMenuItem01;
var themeMenuItem02;
var themeMenuLabel01;
var themeMenuItem03;
var themeMenuItem04;
var themeMenuItem05;
var themeMenuItems;
var themeMenuList;    

function updateThemeMenu(){
    themeMenuLabel00 = new menu.listItem("label", false , "themes:");
    themeMenuItem00 = new menu.listItem("item", false, "dark [default]", `--tag: '🌖';  background-color: var(${basic.linearCondition(config.theme, "dark", "--selected", "--unselected")});`, "click", function(){basic.setTheme("dark", config);}, undefined, "setThemeDark");
    themeMenuItem01 = new menu.listItem("item", false, "darker", `--tag: '⚫'; background-color: var(${basic.linearCondition(config.theme, "darker", "--selected", "--unselected")});`, "click", function(){basic.setTheme("darker", config);}, undefined, "setThemeDarker");
    themeMenuItem02 = new menu.listItem("item", false, "light", `--tag: '☀️';  background-color: var(${basic.linearCondition(config.theme, "light", "--selected", "--unselected")});`, "click", function(){basic.setTheme("light", config);}, undefined, "setThemeLight");
    themeMenuLabel01 = new menu.listItem("label", false , "other");
    themeMenuItem03 = new menu.listItem("small item", false, "", `--tag: '🌳'; background-color: var(${basic.linearCondition(config.theme, "tree", "--selected", "--unselected")});`, "click", function(){basic.setTheme("tree", config);}, undefined, "setThemeTree");
    themeMenuItem04 = new menu.listItem("small item", false, "", `--tag: '🧀'; background-color: var(${basic.linearCondition(config.theme, "cheese", "--selected", "--unselected")});`, "click", function(){basic.setTheme("cheese", config);}, undefined, "setThemeCheese");
    themeMenuItem05 = new menu.listItem("small item", false, "", `--tag: '🫐'; background-color: var(${basic.linearCondition(config.theme, "blueberry", "--selected", "--unselected")});`, "click", function(){basic.setTheme("blueberry", config);}, undefined, "setThemeBlueberry");
    themeMenuItems = [themeMenuLabel00, themeMenuItem00, themeMenuItem01, themeMenuItem02,
                            themeMenuLabel01, themeMenuItem03, themeMenuItem04, themeMenuItem05];
    themeMenuList = new menu.listItem("item", true, "themes", "", "", undefined, themeMenuItems, "themeMenu");                        
} updateThemeMenu();


const volumeMenu00 = new menu.listItem("label", false , "volume:");
const volumeMenu01 = new menu.listItem("item", false, "100", "--tag: '%'", "click", function(){setVolume(100)}, undefined, "setVolume100");
const volumeMenu02 = new menu.listItem("item", false, "75", "--tag: '%'", "click", function(){setVolume(75)}, undefined, "setVolume75");
const volumeMenu03 = new menu.listItem("item", false, "50", "--tag: '%'", "click", function(){setVolume(50)}, undefined, "setVolume50");
const volumeMenu04 = new menu.listItem("item", false, "25", "--tag: '%'", "click", function(){setVolume(25)}, undefined, "setVolume25");
const volumeMenu05 = new menu.listItem("item", false, "mute", "--tag: '-'", "click", toggleMute, undefined, "setVolumeMute");
const volumeMenuItems = [volumeMenu00, volumeMenu01,
                        volumeMenu02, volumeMenu03,
                        volumeMenu04, volumeMenu05];   
const volumeMenuList = new menu.listItem("item", true, "volume", "", "", undefined, volumeMenuItems, "volumeMenu");


function getPlayPauseState(state = true){
    if (!state) {
    if(video.paused)
        return "play";
    else
        return "pause";
    } else {
        if(video.paused)
            return "pause";
        else
            return "play";
    }
}

var openVideoMenuItem00;
var openVideoMenuItem01;
var openVideoMenuItems;
var openVideoMenuList;
var mainMenuButton00;
var mainMenuButton01;
var mainMenuButton02;
var mainMenuButtonGroupItems;
var mainMenuButtonGroup01;
var mainMenuLine00;
var selectThemeMenuList;
var mainMenuItem01;
var mainMenuItems;

var mainMenuList;

function updateMainContextMenu() {
    openVideoMenuItem00 = new menu.listItem("item", false, "select file", "--tag:'📼'", "click", function(){
        fileSelectButton.click();
    }, undefined, "manuSelectFile");
    openVideoMenuItem01 = new menu.listItem("item", false, "load url", "--tag:'🔗'", "click", function(){
        alert("open by url");
    }, undefined, "manuLoadUrl");
    updateRecentItems();
    openVideoMenuItems = [openVideoMenuItem00, openVideoMenuItem01, recentMenuList];
    openVideoMenuList = new menu.listItem("item", false, "open", "--tag:'📁'", "click", function(){
        fileSelectButton.click();
    }, openVideoMenuItems, "openVIdeoMainMenu");

    mainMenuButton00 = new menu.listItem("button", false, "", "--image:url(svg/previous.svg)", "click", function(){
        playPrevious();
    }, themeMenuItems, "mainMenuPlayPrevious");
    mainMenuButton01 = new menu.listItem("button", false, "", `--image:url(svg/${getPlayPauseState(false)}.svg)`, "click", function(){
        switchPlayPause();
    }, themeMenuItems, "mainMenuPlayPause");
    
    mainMenuButton02 = new menu.listItem("button", false, "", "--image:url(svg/next.svg)", "click", function(){
        playNext();
    }, themeMenuItems, "mainMenuPlayNext");
    mainMenuButtonGroupItems = [mainMenuButton00, mainMenuButton01, mainMenuButton02];
    mainMenuButtonGroup01 = new menu.listItem("button group", false, "buttons", "--wrap: no-wrap;", "", undefined, mainMenuButtonGroupItems, "mainMenuButtonGroup");
    mainMenuLine00 = new menu.listItem("line", false, "", "", "", undefined, undefined, "");
    updateThemeMenu();
    selectThemeMenuList = new menu.listItem("item", false, "themes", "--tag:'🎨'", "", undefined, themeMenuItems, "mainMenuThemes");
    mainMenuItem01 = new menu.listItem("item", false, "settings", "--tag:'⚙️'", "click", function() {
        openSettings();
    }, undefined, "mainMenuSettings");
    mainMenuItems = [mainMenuButtonGroup01, mainMenuLine00, openVideoMenuList, selectThemeMenuList,  mainMenuItem01];

    mainMenuList = new menu.listItem("item", true, "main", "", "", undefined, mainMenuItems, "mainMenu");
}


var recentMenuList;
function updateRecentItems() {
    var recentMenuItems = [];
    for (var i = 0; i < history.length && i < 10; i++) {
        const _path = history[i].path;
        recentMenuItems[i] = new menu.listItem("item", false, basic.shorten(path.parse(history[i].path).base, 45), "", "click", () => {
            loadVideo(_path);
        }, undefined, "recent_"+i);
    }
    recentMenuList = new menu.listItem("item", false, "recent", "--tag:'📄'", "", undefined, recentMenuItems, "mainMenuRecent");
} updateRecentItems();

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

navigator.mediaSession.setActionHandler('play', function() {
    forcePlay();
});

navigator.mediaSession.setActionHandler('pause', function() {
    forcePause();
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
    updateMainContextMenu();
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
    updateThemeMenu();
    menu.createGeneratedListMenu(menu.generateListMenu(e, themeMenuList, "themeMenuList"));
}, ["!event"]);

listen.addListener("contactMail", "click", function() {
    navigator.clipboard.writeText("antiqueocean.dev@gmail.com");
});

listen.addListener("contactTelegram", "click", function() {
    window.open("https://t.me/antiqueocean/", '_blank', 'location=yes,height=570,width=520,scrollbars=yes,status=yes');
});

listen.addListener("removePopUp", "click", function() {
    config.temp_popup = false;
    document.getElementById("donationPopUp").remove();
});