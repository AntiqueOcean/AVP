const fs = require('fs');

const ffmpegStatic = require('ffmpeg-static');
export const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegStatic);

const { ipcRenderer } = require('electron');
const localPath = ipcRenderer.sendSync("getLocalPath");
const supportedExtensions = ["mp4", "mkv", "avi", "ogg", "mpg", "wmv"];

// const _config = JSON.parse(fs.readFileSync(localPath + "/config.json"));
// const config = _config[0];

// notifications variables
var notficationsArray = new Array();
var lastNotficationId = 0;

export function s(input) {
    return getComputedStyle(document.body).getPropertyValue(input);
}

export function n(input) {
    var _str = getComputedStyle(document.body).getPropertyValue(input);
    var _out = parseInt(_str);
    return _out;
}

export function range(input, _min, _max) {
    return Math.max(Math.min(input, _max), _min);
}

export function updateConfigFile(input) {
    var _str = "[" + JSON.stringify(input) + ",{}]";
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

export function elementValidateById(_id, _func, _interval = 10) {
    const _tempInterval = setInterval (function(){
        const _elem = document.getElementById(_id);
        if (_elem != null & _elem != "undefined"){
        _func();
        clearInterval(_tempInterval);
        }
    }, _interval);
}

export function isKey(input, _arr) {
    if (_arr != null)
    for (var i = 0; i < _arr.length; i++) {
        if (input == _arr[i])
            return true;
    }
    return false;
}

export function calcSeconds(input) {
    const date = new Date(null);
    date.setSeconds(input);
    return date.toISOString().slice(11, 19);
}
  
export function convertToSeconds(input) {
    var a = input.split(":");
    if (a.length == 3)
        return (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); 
    else
        return currentTime;
}

export function removeInnerOfIndex(input, index) {
    var elem = getFromIndex (input, index);
    elem.innerHTML = "";
}


var previousTheme;
export function setTheme(input, _config, notify = true) {
    previousTheme = _config.theme;
    var current = document.documentElement.getAttribute('class');
    current = current.split(" ");
    current[0] = 'theme-'+input;
    current = current.join(" ");
    document.documentElement.setAttribute('class', current);

    _config.theme = input;
    if (notify)
        addNotification("🖌️ " + input + " theme, <u>click to undo</u>", 8000, true, "themeChanged", undefined, `onclick="setTheme('` + previousTheme + `')"`);
}



/* ***** [Functions] **** */
/* Notification Functions */

export function addNotification(input, duration, unique = false, _name = "none", color = "var(--notification-text-color)", _additional) {
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

export function removeNotification(index) {
    document.getElementById(notficationsArray[index][0]).remove();
    notficationsArray[index][0] = "removed";
}

export function removeNotificationById(_id) {
    for (var i = 0; i < notficationsArray.length; i++) {
        if (notficationsArray[i][0] === _id) {
            document.getElementById(notficationsArray[i][0]).remove();
            notficationsArray[i][0] = "removed";
        }
    }
}

export function handleNotifications(deltaTime) {
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

export function linearCondition(_variable, _value, returnTrue, returnFalse) {
    if (_variable == _value)
        return returnTrue;
    return returnFalse;
}

export function shorten(input, length, sign = "...", cutEnd = true) {
    const _diff = length - input.length;
    var result = input;
    if (_diff < 0) {
        if (cutEnd)
            result = input.slice(0, length) + sign;
        else
            result = sign + input.slice(_diff);
    }
    return result;
}


export function isOfType(input) {
    
    for (var i = 0; i < supportedExtensions.length; i++)
        if (input == supportedExtensions[i])
            return true;
    return false;
}

// **********************************************
// play data
// **********************************************

export class videoData {
    constructor(name, duration, path, format, last, width, height, bitrate, fps, size, codec) {
        this.name = name;
        this.duration = duration;
        this.path = path;
        this.format = format;
        this.last = last;
        this.width = width;
        this.height = height;
        this.bitrate = bitrate;
        this.fps = fps;
        this.size = size;
        this.codec = codec;
    }
};

export class audioData {
    constructor(name, format, bitrate, language, status) {
        this.name = name;
        this.format = format;
        this.bitrate = bitrate;
        this.language = language;
        this.status = status;
    }
};

export class subtitileData {
    constructor(name, format, language) {
        this.name = name;
        this.format = format;
        this.language = language;
    }
};

export class playData {
    constructor(video, audio, subtitle) {
        this.video = video;
        this.audio = audio;
        this.subtitle = subtitle;
    }
}



