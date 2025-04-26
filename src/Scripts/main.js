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

const { app, BrowserWindow, electron, contextBridge,
    ipcMain, ipcRenderer, dialog } = require('electron');

const path = require('path');
const fs = require('fs');
const { Howl } = require ('howler');

/* ------------- ----------- ------------- */
/* ------------- [variables] ------------- */
/* ------------- ----------- ------------- */
// loading set variables

const appPath = ipcRenderer.sendSync("getAppPath");
const localPath = ipcRenderer.sendSync("getLocalPath");

const _config = JSON.parse(fs.readFileSync(localPath + "/config.json"));
export var config = _config[0];
const history = JSON.parse(fs.readFileSync(localPath + "/history.json"));
var key = JSON.parse(fs.readFileSync(localPath + "/input.json"))[0];



// input variables
var pausingControl = false;
var inputingTime = false;
var selectedFileReturnValueInterval;


// global ui variables
var tickRate = config.tick_rate; //ms
var isTempMenuOpen = false;
var isPreviewReady = false;
var previewArray = [];
var previewArrayLength = 0;
var previewGenerationProcess;

var lastTopBarHeight = 80;
var lastBottomBarY = 200;
var cursoHideTimer = 500;
var fullScreenState = false;
var currentInputElement = null;

// video control variables
var currentDuration = 0;
var currentTime = 0;
var playing = 0;
var timebarMouseX;
var forwardingSeconds = config.forwarding_time;
var currentPath = undefined;
var currentDirectory = "";
var lastDirectory = "none";
var fileList = [];
var replay = config.replay;
var checkIfVideoIsPlaying = true;
var checkIfVideoIsPlayingTime = 0;
var playerConversionProcess = null;
var mainConversionProcess = null;
var videoConvertList = [];

//Audio control variables
var audio = null;
var hasSound = false;
var lastVolume = 25;
var audioCheck = 2000;
var autoSync = config.autoSync;
var syncAmount = 0.25;
var audioExtractProcess = null;

//Subtitle control variables
var subtitleExtractProcess = null;

//play control

var metadata;
var currentPlayData = new basic.playData;
var initExtractionRuningProcessesCount = 2;
var mediaLoadUpInterval = null;

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
var webAudio = document.getElementById("audio");
var volumeBar = document.getElementById("volumeBar");
var volumeBarBg = document.getElementById("volumeBarBg");
var volumeController = document.getElementById("volumeController");
var volumeNumberInput = document.getElementById("volumeNumberInput");
var muteButton = document.getElementById("muteButton");
var useWebAudio = false;

//other elements
var tempMenuPlaceHolder = document.getElementById("currentTempMenu");
var notifications = document.getElementById("notifications");
var mainWin = document.getElementById("mainWin");
const topBar = document.getElementById("topBar");
const bottomBar = document.getElementById("bottomBar");
const barFileSelectInput = document.getElementById("fileSelectInput");

// var video2 = document.getElementById("video2");
// var player = null;
// var playback = function(event) {
//     event.preventDefault();
//     if (player) {
//         player.stop();
//     }
// }
// player = new l265.libde265.RawPlayer(video2);
// player.playback("/mnt/C2D49BC8D49BBCDB/Archive/Series/Succession/Succession_S01E02_10bit_x265_720p_BluRay_30nama_30NAMA.mkv");

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
    if (video.readyState == 4)
        config.last_path = currentPath;
    addCurrentToHistory();
    updateHistoryFile();
    updateInputFile();
    basic.updateConfigFile(config);
    if (previewGenerationProcess != null)
        previewGenerationProcess.kill();
    if (playerConversionProcess != null)
        playerConversionProcess.kill();
    setTimeout (() => {
        ipcRenderer.send("quitWindow");
    }, 250);
}

function toggleFullscreen(e){
    menu.closeTempMenu();
    ipcRenderer.send("toggleFullscreen");
    fullScreenState = ipcRenderer.sendSync("fullScreenState");
    fullscreenUiCheck(e);
}

function openSettings() {
    ipcRenderer.invoke('openSettings', config, key);
}

function loadVideoFromInput() {
    if (fname.value != "none")
        loadVideo(fname.value);
    editCheck.checked = false;
    updateUi();
}

function loadVideoFromDrop(event) {
    event.preventDefault();
    if (basic.isOfType(path.extname(event.dataTransfer.files[0].path).slice(1)))
        loadVideo(event.dataTransfer.files[0].path);
}

function runIfValid(input, _func, _step = 25) {
    var _validateThisInvertal = setInterval(() => {
        if (input != null && typeof input != 'undefined') {
            _func();
            clearInterval(_validateThisInvertal);
        }
    }, _step);
}

function getSubtitleFormat(input) {
    if (input == "subrip")
        return "srt";
    return input;
}
var _validateStreamsInterval = null;

var initExportRanOnce = false;
function loadMetadata(_input) {
    metadata = null;
    delete currentPlayData.video;
    delete currentPlayData.audio;
    delete currentPlayData.subtitle;

    basic.ffmpeg(_input).ffprobe(function(err, _metadata_) {
        metadata = _metadata_;
        // console.log(metadata);
    });

    clearInterval(_validateStreamsInterval);

    initExportRanOnce = false;
    setTimeout(() => {
        _validateStreamsInterval = setInterval(() => {
            if (metadata != null && !initExportRanOnce) {
                currentPlayData = new basic.playData(new Array(), new Array(), new Array(), metadata.format.filename, metadata.format.size, metadata.format.duration);
                // currentPlayData.path = metadata.format.filename;
                // currentPlayData.size = metadata.format.size;
                // currentPlayData.duration = metadata.format.duration;

                currentPlayData.video = [];
                currentPlayData.audio = [];
                currentPlayData.subtitle = [];
                videoConvertList = [];


                for (var i = 0; i < metadata.streams.length; i++) {
                    if (metadata.streams[i].codec_type == "video") {
                        currentPlayData.video.push(new basic.videoData(metadata.streams[i].index, metadata.streams[i].width, metadata.streams[i].height, metadata.streams[i].bitrate, metadata.streams[i].r_frame_rate, metadata.streams[i].codec_name));
                        if(metadata.streams[i].codec_name == "hevc") {
                            basic.addNotification("⚠️ Hevc (x265) is not supported by this player yet", 8000);
                            if(config.convertHevc) {
                                videoConvertList.push(
                                new basic.convertData(_input, "h264", "mp4" /*path.extname(_input).slice(1)*/, config.hevcConversionrate, metadata.streams[i].width, metadata.streams[i].height, localPath + "/video/" + path.parse(_input).name)
                                );
                            }
                        }
                    }
                    else if (metadata.streams[i].codec_type == "audio") {
                        currentPlayData.audio.push(new basic.audioData(metadata.streams[i].index, metadata.streams[i].codec_name, metadata.streams[i].bit_rate, metadata.streams[i].tags.title, metadata.streams[i].tags.language, false));
                    }
                    else if (metadata.streams[i].codec_type == "subtitle") {
                        currentPlayData.subtitle.push(new basic.subtitileData(metadata.streams[i].index, metadata.streams[i].codec_name, metadata.streams[i].tags.title, metadata.streams[i].tags.language));
                    }
                }

                if (currentPlayData.audio.length > 0)
                    hasSound = true;
                else
                    hasSound = false;

                //start of audio and subtitle extraction
                initExtractionRuningProcessesCount = currentPlayData.audio.length + currentPlayData.subtitle.length + videoConvertList.length;

                if (audioExtractProcess != null)
                    audioExtractProcess.kill();
                if (subtitleExtractProcess != null)
                    subtitleExtractProcess.kill();
    
                audioExtractProcess = null;
                subtitleExtractProcess = null;
                removeFilesFromDirectory("audiotracks");
                if ((currentPlayData.audio.length > 1 && config.extractAudio) || (currentPlayData.audio.length == 1 && config.singleAudioExport && config.extractAudio)) {
                    console.log("why is this running")
                    var _audioExtractcode = "audioExtractProcess = basic.ffmpeg().input(_input)";
                    for (var i = 0; i < currentPlayData.audio.length; i++) {
                        const _outputPath = localPath + "/audiotracks/" + i + "_" + currentPlayData.audio[i].language + "_" + currentPlayData.audio[i].title + path.parse(currentPath).name + "." + currentPlayData.audio[i].format;
                        _audioExtractcode += `.saveToFile("${_outputPath}").outputOption("-map", "0:a:${i}?").outputOption("-c", "copy")`;
                        currentPlayData.audio[i].path = _outputPath;
                    }
                    _audioExtractcode += `.on("end", () => {
                        initExtractionRuningProcessesCount--;
                    });`;
                    audio = null;
                    useWebAudio = false;
                    eval(_audioExtractcode);
                } else {
                    if (currentPlayData.audio.length == 1 || (currentPlayData.audio.length != 0 && !config.extractAudio)) {
                        currentPlayData.audio[0].path = _input;
                        useWebAudio = true;
                        audio = webAudio;
                    }
                    for (var i = 0; i < currentPlayData.audio.length; i++)
                        initExtractionRuningProcessesCount--;
                }
               
                if (currentPlayData.subtitle.length != 0) {
                    removeFilesFromDirectory("subtitles");
                    var _subtitleExtractCode = "subtitleExtractProcess = basic.ffmpeg().input(_input)";
                    for (var i = 0; i < currentPlayData.subtitle.length; i++) {
                        _subtitleExtractCode += `.saveToFile(localPath + "/subtitles/${i + "_" + currentPlayData.subtitle[i].language + "_" + currentPlayData.subtitle[i].title}.${getSubtitleFormat(currentPlayData.subtitle[i].format)}").outputOption("-map", "0:s:${i}").outputOption("-c", "copy")`;
                    }
                    _subtitleExtractCode += `.on("end", () => {
                        initExtractionRuningProcessesCount--;
                    });`;
                    eval(_subtitleExtractCode);
                } else {
                    for (var i = 0; i < currentPlayData.subtitle.length; i++)
                        initExtractionRuningProcessesCount--;

                }
    
                // end of audio and subtitle extraction

                //start of video conversion
                for (var i = 0; i < videoConvertList.length; i++) {
                    convert(videoConvertList[i], function(percent){
                    console.log(percent);   
                    }, function(){
                        initExtractionRuningProcessesCount--;
                    })
                }
                //end of video conversion

                initExportRanOnce = true;
                clearInterval(_validateStreamsInterval);
                _validateStreamsInterval = null;
            }
        }, 50);
    }, 50);

}

function refreshDirectory() {
    if (currentDirectory != lastDirectory && fs.existsSync(currentPath)) {
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

function updateInputFile() {
    var _str = "[" + JSON.stringify(key) + "]";
    for (var i = 0; i < _str.length; i++) {
        if (_str[i] == ',' || _str[i] == '{') {
            _str = _str.slice(0, i+1) + "\n" + _str.slice(i+1);
            i++;
        } else if (_str[i] == '}') {
            _str = _str.slice(0, i) + "\n" + _str.slice(i);
            i++;
        }
    }

    fs.writeFile(localPath + "/input.json", _str, (error) => {
        if(error) {
            //console.error(error);
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
            //console.error(error);
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
    if (currentPath != undefined) {
        fileTitle.value = path.parse(currentPath).base;
        windowTitle.innerHTML = "AVP [" + path.parse(currentPath).base + ']';
        filePathInput.value = currentPath;
    }
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


function setNewTime(input, _syncAudio = true) {
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
    if (_syncAudio)
        syncAudio();
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

function convert(convertData, _function_progress = null, _function_end = null) {
    let _duration = 0;

    playerConversionProcess = basic.ffmpeg(convertData.source).saveToFile(convertData.targetPath + '.' + convertData.targetExtension)
    .outputOption("-c", "copy")
    .outputOption("-vcodec", "libx264")
    .outputOption("-qscale:v", `${31/10*convertData.targetRate}`)
    .on('codecData', data => {
        _duration = parseInt(data.duration.replace(/:/g, '')) 
     })
    .on("progress", progress => {
        const _time = parseInt(progress.timemark.replace(/:/g, ''))
        const _percent = (_time / _duration) * 100;
        if (_function_progress != null)
        _function_progress(_percent);
    }).on("end", function() {
        if (_function_end != null)
        _function_end();
    })
}

// function convert(convertData, _function_progress = null, _function_end = null) {
//     let _duration = 0;outputOption("-c", "copy"
//     console.log(31/10*convertData.targetRate);
//     playerConversionProcess = basic.ffmpeg(convertData.source).outputOption("-qscale:v", `${31/10*convertData.targetRate}`).withSize(`${convertData.width}x${convertData.height}`).saveToFile(convertData.targetPath + '.' + convertData.targetExtension)
//     .on('codecData', data => {
//         _duration = parseInt(data.duration.replace(/:/g, '')) 
//      })
//     .on("progress", progress => {
//         const _time = parseInt(progress.timemark.replace(/:/g, ''))
//         const _percent = (_time / _duration) * 100;
//         if (_function_progress != null)
//         _function_progress(_percent);
//     }).on("end", function() {
//         if (_function_end != null)
//         _function_end();
//     })
// }

function currentAudio() {
    if (!useWebAudio)
        return audio.seek();
    return audio.currentTime;
}

var tickInterval = setInterval(tick, tickRate);
function tick() {
    if (playing != 3 && video.readyState == 4)
        playing = + !video.paused;
    if (cursoHideTimer <= 0 && mainWin.style.cursor != "none" && fullScreenState)
        mainWin.style.cursor = "none";
    else if (fullScreenState)
        cursoHideTimer -= tickRate;

    if (playing == 1)
        playButton.style.setProperty ("--image", "url(svg/pause.svg)");
    else if (playing == 0)
        playButton.style.setProperty ("--image", "url(svg/play.svg)");
    else if (playing == 3) {
        playButton.style.setProperty ("--image", "url(svg/loading.svg)");
    }
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
    if(hasSound && autoSync && audio != null)
    if ((audioCheck <= 0) && (video.currentTime - currentAudio() + (config.audioDelayAmount/1000) >= syncAmount)) {
        syncAudio();
        audioCheck = 2000;
    }
    if (checkIfVideoIsPlaying && currentPath != undefined) {
        checkIfVideoIsPlayingTime -= tickRate;
        if (checkIfVideoIsPlayingTime <= 0) {
            basic.addNotification("Err: video:<br/> <u>[" + currentPath + "]</u><br/>is not valid, <small>playing next in the directory.</small>", 5000, false, "videoIsNotValid", "red");
            playNext();
        }
    }
}

function removeFilesFromDirectory(input) {
    fs.readdir(localPath + "/" + input, { withFileTypes: true },
        (err, files) => {
        if (!err && files != undefined) {
            files.forEach(file => {
                fs.unlink(path.join(localPath + "/" + input, file.name), () => {});
            });
        }
      })
}

function setNewTimeNoSoundSync() {
    setNewTime(undefined, false);
}
var updateBarMouseUpInterval;
function updateBar() {
        window.addEventListener("mouseup", setNewTimeEnd);
        updateBarMouseUpInterval = setInterval(setNewTimeNoSoundSync, 25); 
}

function setNewTimeEnd(){
    clearInterval(updateBarMouseUpInterval);
    setNewTime(undefined);
    window.removeEventListener("mouseup", setNewTimeEnd);
}

/* ***** [Functions] ***** */
/* Video Control Functions */

ipcRenderer.on("main_generatedPreviewResult", (event, array) => {
    previewArray = array;
});

ipcRenderer.on("settingResult", (event, _config, _key) => {
    if (_config != null)
        config = _config;
    if (_key != null)
        key = _key;
    updateAll();
});

function getPreviewByPercent(input) {
    if (previewArray.length != 0)
        return previewArray[Math.min(Math.round(previewArray.length/100*input), previewArray.length-1)];
    return "Styles/images/loadingPreview.jpg";
}

function loadVideo(input = "none", reset_current = false) {
    if (fs.existsSync(input)) {
        video.srcObject = null;
        if(video.readyState === 4) 
            addCurrentToHistory(!reset_current);
        playing = 3;
        if (audio != null) {
            if (!useWebAudio) {
                audio.stop();
                audio.unload();
            } 
        }
        currentPath = input;
        currentDirectory = path.parse(currentPath).dir;
        refreshDirectory();
        video.pause();
        video.src = input;

        checkIfVideoIsPlaying = true;
        checkIfVideoIsPlayingTime = 2000;

        video.onloadeddata = function() {

            checkIfVideoIsPlaying = false;

            if (config.showPreview) {
                previewArray = [];
                ipcRenderer.invoke("generatePreview", input, video.duration / config.previewStep);
            } else {
                previewImage.style.display = "none";
            }


            if (mediaLoadUpInterval != null)
                clearInterval(mediaLoadUpInterval);

            loadMetadata(input);

            mediaLoadUpInterval = setInterval(function() {
                if (initExtractionRuningProcessesCount == 0) {
                    if (hasSound && currentPlayData.audio != null && currentPlayData.audio.length > 0) {
                        if(fs.existsSync(currentPlayData.audio[0].path)) {
                            playing = 0;
                            loadAudio(currentPlayData.audio[0]);
                            if (config.autoPlay)
                                forcePlay();
                            clearInterval(mediaLoadUpInterval);
                            mediaLoadUpInterval = null;
                    }}
                    else if (!hasSound) {
                        playing = 0;
                        basic.addNotification("🔇 current media has no audio tracks", 3000);
                        loadAudio(null);
                        if (config.autoPlay)
                            forcePlay();
                        clearInterval(mediaLoadUpInterval);
                        mediaLoadUpInterval = null;
                    }
                    
                }
            }, 50);

            if (config.open_as_left) {

                const _time_ = getFromHistory(input);
                // if (_time_ >= (video.duration - 0.25))
                    setNewTime(_time_);
            }

            basic.addNotification(path.parse(currentPath).base, 8000, true, "videoTitle", undefined, undefined, function(){
                basic.removeNotificationById("notif_videoTitle");
            });
            
            const _newHeight = topBar.getBoundingClientRect().height + bottomBar.getBoundingClientRect().height + basic.range(video.videoHeight, 0, window.screen.height-40);
            // disable beacause of windows
            // ipcRenderer.invoke("setWindowSize", basic.range(video.videoWidth, 0, window.screen.width-80), _newHeight);


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
    if (video != "undefined" && playing != 3)
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
        if (hasSound && audio != null) {
            if (!useWebAudio) {
                audio.pause();
                syncAudio();
                audio.play();
            } else {
                audio.play();
                syncAudio();
            }
        }
        basic.addNotification("⏯️ Playing", 1000, true, "playState", "var(--alt-color-green)",  `onclick="removeNotificationById(this.id)"`);
    
}

function forcePause() {

        video.pause();
        if (hasSound && audio != null) {
            audio.pause();
        }
        basic.addNotification("⏯️ Paused", 1000, true, "playState", "var(--alt-color-red)",  `onclick="removeNotificationById(this.id)"`);
    
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
    setNewTime(basic.convertToSeconds(timeInput.value));
    timeInput.blur();
}

function playUrl(intput) {

}

function playNext(reset_current = false) {
    const _index = fileList.indexOf(currentPath) + 1;
    if (_index < fileList.length)
        loadVideo(fileList[_index], reset_current);
    else {
        loadVideo(fileList[0], reset_current);
    }
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

function loadAudio(input) {
    if (audio != null) {
        audio.pause();
        if (!useWebAudio)
            audio.unload();
    }
    if (input != null)
    if (fs.existsSync(input.path)) {
        if (!useWebAudio) {
            audio = new Howl({
                src: input.path,
                html5: true     
            });
            audio.load();
            if (!video.paused) {
                syncAudio();
                audio.play();
            }} 
        else {
            audio.src = input.path;
            syncAudio();
        }
    }
}

function syncAudio() {
    if (audio != null) {
        const _pos = video.currentTime + (config.audioDelayAmount/1000);
        if (!useWebAudio)
            audio.seek(_pos);
        else
            audio.currentTime = _pos;
    }
}

function updateVolumeUi(){
    volumeBar.style.width = (config.volume) + "%";
    volumeNumberInput.value = config.volume;
    if (config.volume == 0) 
        muteButton.style.setProperty("--image", "url(svg/audioOff.svg)");
    else 
        muteButton.style.setProperty("--image", "url(svg/audioOn.svg)");
}

function setVolume(input) {
    if (volumeNumberInput != null)
        volumeNumberInput.blur();
    var _input = Math.round(input);
    if (input > 100)
        _input = 100;
    else if (input < 0) 
        _input = 0;
    config.volume = _input;
    if (audio != null) {
        if(!useWebAudio)
            audio.volume (config.volume/100);
        else
            audio.volume = config.volume/100
    }

    if (_input != 0)
        basic.addNotification("🔈" + Math.round(_input) + "%", 1000, true, "volumechange");
    else {
        basic.addNotification("🔇 Muted", 4000, true, "muted", undefined, undefined, function(){
            toggleMute();
            basic.removeNotificationById("notif_muted");
        });
    }
    updateVolumeUi();
}

function setVolumeFromBar(event) {
    var _mouseX = event.clientX;
    var poistion = Math.abs(volumeBarBg.getBoundingClientRect().x - _mouseX);
    var width = (poistion / volumeBarBg.getBoundingClientRect().width) * 100;
    if (width < 10) {
        width = 0;
        lastVolume = config.volume;
    }
    else if (width > 90)
        width = 100;
    setVolume(width);
}

function setVolumeFromMouseWheel(event) {
    var _amount = 2;
    var _direction = -1;
    var _current = config.volume;
    if (event.deltaY < 0)
    _direction = 1;
    setVolume((_current)+(_amount*_direction));
}

function setVolumeFromInput() {
    setVolume(volumeNumberInput.value);
}


function toggleMute(){
    if (config.volume === 0 && lastVolume != 0)
        setVolume(lastVolume);
    else if (config.volume == 0 && lastVolume == 0)
        setVolume(25);
    else {
        lastVolume = config.volume;
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
            setVolume(config.volume+2);
        }
        else if (basic.isKey(code, key.volumeDown)) {
            setVolume(config.volume-2);
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
        // else if (basic.isKey(code, key.invert)) {
        //     if(config.invert == 100)
        //         config.invert = 0;
        //     else
        //         config.invert = 100;
        //     updateVideoFilters();
        //     basic.addNotification("invert", 1000, true, "invert");
        // }
        else if (basic.isKey(code, key.delayAudioBackward)) {
            config.audioDelayAmount -= config.audioDelayAddingAmount;
            syncAudio();
            basic.addNotification("Audio Delay: " + config.audioDelayAmount , 1000, true, "audioDelay");
        }
        else if (basic.isKey(code, key.delayAudioForward)) {
            config.audioDelayAmount += config.audioDelayAddingAmount;
            syncAudio();
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
var audioMenuItems;
var audioMenuList;
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
        console.log(streams[0]);
    }, undefined, "manuLoadUrl");
    updateRecentItems();
    updateAudioTrackItems();
    openVideoMenuItems = [openVideoMenuItem00, openVideoMenuItem01, recentMenuList];
    openVideoMenuList = new menu.listItem("item", false, "open", "--tag:'📁'", "click", function(){
        fileSelectButton.click();
    }, openVideoMenuItems, "openVIdeoMainMenu");

    audioMenuItems = [audioTracksMenuList];
    audioMenuList = new menu.listItem("item", false, "audio", "--tag:'📢'", "", null, audioMenuItems, "audioMainMenu");

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
    mainMenuItems = [mainMenuButtonGroup01, mainMenuLine00, openVideoMenuList, audioMenuList, selectThemeMenuList,  mainMenuItem01];

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

var audioTracksMenuList;
function updateAudioTrackItems() {
    var audioTracksItems = [];
    if (currentPlayData.audio != null)
    for (var i = 0; i < currentPlayData.audio.length; i++) {
        const _item = currentPlayData.audio[i];
        audioTracksItems[i] = new menu.listItem("item", false, '[' + currentPlayData.audio[i].language + "] " + currentPlayData.audio[i].title, "--tag:'" + (i+1) + "'", "click", () => {
            loadAudio(_item);
        }, undefined, "audio_"+i);
    } else {
        audioTracksItems[0] = new menu.listItem("item", false, "none", "--tag:'-'", "", undefined, "noAudio");
    }
    audioTracksMenuList = new menu.listItem("item", false, "tracks", "--tag:'🎵'", "", undefined, audioTracksItems, "mainMenuAudioTracks");
}

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
    if (playing != 3)
        forcePlay();
});

navigator.mediaSession.setActionHandler('pause', function() {
    if (playing != 3)
        forcePause();
});

navigator.mediaSession.setActionHandler('previoustrack', function() {
    playPrevious();
});

navigator.mediaSession.setActionHandler('nexttrack', function() {
    playNext();
});

listen.addListener("previousButton", "click", function() {
    this.blur();
    playPrevious();
});

listen.addListener("nextButton", "click", function() {
    this.blur();
    playNext();
});

listen.addListener("forwardButton", "click", function() {
    this.blur();
    if (playing != 3)
        forwardSeconds();
});

listen.addListener("timeInputForm", "submit", function() {
    if (playing != 3)
        setTimeFromInput();
});

listen.addListener("timerBarMiddle", "mousedown", function() {
    if (playing != 3)
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
    selectedFileReturnValueInterval = setInterval(function() {
        if (barFileSelectInput.value != "" && barFileSelectInput.value != null) {
            loadVideo(barFileSelectInput.files[0].path);
            barFileSelectInput.value = "";
            clearInterval(selectedFileReturnValueInterval);

        }
    }, tickRate);
}, ["!event"])


listen.addListener("timerBarMiddle", "mousemove", function(e) {
    if (playing != 3)
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
    if (playing != 3)
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
