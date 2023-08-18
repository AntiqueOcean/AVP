// /* Copyright (C) 2023 antiqueOcean <antiqueocean.dev@gmail.com> - All Rights Reserved
//  * Unauthorized copying of this file, via any medium is strictly prohibited
//  * Proprietary and confidential.
//  */

// /* ------------ ---------- ------------ */
// /* ------------ [Settings] ------------ */
// /* ------------ ---------- ------------ */


const { dialog, electron, ipcRenderer } = require('electron');
import * as basic from './basics.js';
import * as listen from './listener.js';
var config = null;

const content = document.getElementById("content");

ipcRenderer.on("reciveData", (event, _config) => {
    config = _config;
    init();
});


const localPath = ipcRenderer.sendSync("getLocalPath");


const path = require('path');
const fs = require('fs');

const key = JSON.parse(fs.readFileSync(localPath + "/input.json"))[0];


function init(){
    basic.setTheme(config.theme, config, false);
}


export class item {
    constructor(_content, IDs = [], triggers = [], functions = [], passing = []) {
        this.content = _content;
        this.IDs = IDs;
        this.triggers = triggers;
        this.functions = functions;
        this.passing = passing;
    }
};


var testItem1 = new item(`
<span>text here</span>
<div class="spacer"></div>
<button id="testButton1">Click 1</button>
`, ["testButton1"], ["click"], [function(e){
    alert("1: " + e.target);
}], [["!event"]]);

var testItem2 = new item(`
<span>text here</span>

<button id="testButton2">Click 2</button>
`, ["testButton2"], ["click"], [function(e){
    alert("2: " + e.target);
}], [["!event"]]);

var testItemList = [testItem1, testItem2];



function generateItemList(items = []) {
    var _content = `<div class="item-list">`;
    for (var i = 0; i < items.length; i++) {
        _content += `<div class="item">` + items[i].content + `</div>`;
        for (var n = 0; n < Math.min(items[i].IDs.length, items[i].triggers.length, items[i].functions.length); n++) {
            const _item = items[i];
            const index = n;
            basic.elementValidateById(items[i].IDs[index], function(t = _item) {
                listen.addListener(_item.IDs[index], _item.triggers[index], _item.functions[index], _item.passing[index]);
            }, 25);
        }
        
    }
        _content += `</div>`;
    return _content;
}

listen.addListener("apply", "click", function(){
    ipcRenderer.invoke("closeSettings", config);
});

listen.addListener("close", "click", function(){
    ipcRenderer.invoke("closeSettings", null);
});

listen.addListener("inputButton", "click", function(){
    const _content = generateItemList(testItemList);
    content.innerHTML = _content;
});

function getKeysForActions() {
    for (var i = 0; i < _keys.length; i++) {

        var _key = key.play;

        for (var p = 0; p < _key.length; p++) {
            var _code = `<div class="key-select">` + _key[p] +`</div>`
            _keys[i].parentElement.insertAdjacentHTML('afterbegin', _code);
        }
        _keys[i].remove;
    }
}



function setSettingsContent(input) {
    const settingsContent = document.getElementById("settingsContent");
    const settingsTitlebar = document.getElementById("settingsTitlebar");
    const settingsContentParent = settingsContent.parentElement;

    setTimeout(() => {
        const _height = settingsContentParent.getBoundingClientRect().height - 16 + 'px';
        settingsContent.style.setProperty("--content-parent-height", _height);

        if (input === "input") {
            settingsContent.innerHTML = settings_input;
            settingsTitlebar.innerHTML = "Settings [Input]";
            getKeysForActions();
        }
    }, 50);
    
}
