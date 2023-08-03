/* ------------- --------- ------------- */
/* ------------- [Headers] ------------- */
/* ------------- --------- ------------- */

const { constants } = require("original-fs");
const { dialog, BrowserWindow } = require('electron');
const path = require('path');
const { electron } = require('process');
const fs = require('fs');

/* ------------- ----------- ------------- */
/* ------------- [variables] ------------- */
/* ------------- ----------- ------------- */

// loading set variables
const _config = JSON.parse(fs.readFileSync("src/config.json"));
const config = _config[0];

// input variables
var pausingControl = false;

// global ui variables
var tickRate = config.tick_rate; //ms
var isTempMenuOpen = false;
var previousTheme;

// video control variables
var currentDuration = 0;
var currentTime = 0;
var playing = false;
var timebarMouseX;
var forwardingSeconds = config.forwarding_time;

//volume control variables
var lastVolume = 25;

// notifications variables
var notficationsArray = new Array();
var lastNotficationId = 0;

/* ------------- ---------- ------------- */
/* ------------- [Elements] ------------- */
/* ------------- ---------- ------------- */

// video control elements
var video = document.getElementById("video");
var timeStamp = document.getElementById("timeStamp"); 
var timeStampInput = document.getElementById("timeStampInput");
var timerBarMiddle = document.getElementById("timerBarMiddle"); 
var timerBarMiddleBar = document.getElementById("timerBarMiddleBar");
var timerBarRight = document.getElementById("timerBarRight");
var backwardButton = document.getElementById("backwardButton");
var playButton = document.getElementById("playButton");
var forwardButton = document.getElementById("forwardButton");


//volume control elements
var volumeBar = document.getElementById("volumeBar");
var volumeBarBg = document.getElementById("volumeBarBg");
var volumeController = document.getElementById("volumeController");
var volumeNumberInput = document.getElementById("volumeNumberInput");
var muteButton = document.getElementById("muteButton");

//other elements
var tempMenuPlaceHolder = document.getElementById("currentTempMenu");
var notifications = document.getElementById("notifications");


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
    }
})

window.addEventListener("focusout", function(e) {
    if (e.target.nodeName === "INPUT") {
        pauseKeyControl(false);
    }
})


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

function init() {

    setVolume(config.volume);
} 

function safeClose() {
    config.volume = Math.round(video.volume*100);
    updateConfigFile();
    window
    setInterval (() => {window.close();}, 250);
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

    fs.writeFile("src/config.json", _str, (error) => {
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
    return (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); 
}
  
function updateNavigator() {
    navigator.mediaSession.metadata = new MediaMetadata({
        title: path.parse(video.getAttribute("src")).base,
        artist: video.artist,
        album: video.album
      });
}

function updateAll(){
    setTheme(config.theme, false);
    updateNavigator();
    updateTimerUi(true);
}


function setNewTime(input) {
    let settingTime;
    if(typeof input === 'undefined') {
      var leftPos = timerBarMiddle.getBoundingClientRect().left + window.scrollX;
      settingTime = ((this.timebarMouseX-leftPos) / timerBarMiddle.getBoundingClientRect().width) * (this.currentDuration);
    }
    else {
      settingTime = input;
    }
    video.currentTime = settingTime;
    currentTime = settingTime;
  }
  
  function updateTimerUi(input){
    timeStampInput.value = calcSeconds(currentTime);
    timerBarMiddleBar.style.width = (currentTime/currentDuration*100)+'%';
    if (input)
      timerBarRight.innerHTML = calcSeconds(currentDuration);
}
  
function updateTimeStamp(event) {
    timebarMouseX = event.clientX;
    var leftPos = timerBarMiddle.getBoundingClientRect().left + window.scrollX;
    timeStamp.style.left = (timebarMouseX-leftPos-(timeStamp.getBoundingClientRect().width / 2))+'px';
    timeStamp.innerHTML = calcSeconds(((timebarMouseX-leftPos) / timerBarMiddle.getBoundingClientRect().width) * (this.currentDuration)) + ' [' + (Math.round(((((timebarMouseX-leftPos) / timerBarMiddle.getBoundingClientRect().width) * (this.currentDuration)/currentDuration*100)) * 10)/10).toFixed(1)+'%]'; 
}


var tickInterval = setInterval(tick, tickRate);
function tick() {
    
    playing = !video.paused;
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

function switchPlayPause() {
    if (video != "undefined")
    {
        if (video.paused) {
            video.play();
            addNotification("⏯️ Playing", 1000, true, "playState", "var(--alt-color-green)",  `onclick="removeNotificationById(this.id)"`);
        }
        else {
            video.pause();
            addNotification("⏯️ Paused", 1000, true, "playState", "var(--alt-color-red)",  `onclick="removeNotificationById(this.id)"`);
        }
    }
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

function playUrl(intput) {

}

function playNext() {

}

function playPrevious() {

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
    _input = Math.round(input);
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
    _amount = 2;
    _direction = -1;
    _current = video.volume;
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

window.onkeydown = function(event) {
    if (!pausingControl) {
        var code = event.code;
        closeTempMenu();
        if (code == "Space") {
            switchPlayPause();
            closeTempMenu();
        }
        else if (code == "ArrowRight") {
            forwardSeconds();
        }
        else if (code == "ArrowLeft") {
            backwardSeconds();
        }
        else if (code == "KeyM") {
            toggleMute();
        }
        else if (code == "KeyP") {
            switchPlayPause();
        }
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