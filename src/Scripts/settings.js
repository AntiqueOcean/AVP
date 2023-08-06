const { constants } = require("original-fs");
const { dialog, BrowserWindow } = require('electron');
const path = require('path');
const { electron } = require('process');
const fs = require('fs');
const { time } = require("console");
const { unique } = require("jquery");

const key = JSON.parse(fs.readFileSync("src/input.json"))[0];
/* ------------ ---------- ------------ */
/* ------------ [Settings] ------------ */
/* ------------ ---------- ------------ */

function getKeysForActions() {
    let _keys = document.getElementsByClassName("getKeys");
    for (var i = 0; i < _keys.length; i++) {
        let _key = key[_keys[i].parentElement.getAttribute("name")];
        alert(_key);
        for (var p = 0; p < _key.length; p++) {
            var _code = `<div class="key-select">` + _key[p] +`</div>`
            _keys[i].parentElement.insertAdjacentHTML('afterbegin', _code);
        }
        _keys[i].remove;
    }
}

var settings_input = `
<div class="item">
    <div class="upper" style="opacity:75%;">
        <h1><small>Key Bindings:</small></h1>
    </div>
</div>

<div class="item" id="item_play">
    <div class="upper">
        <h1>Play/Pause</h1>
    </div>
    <div class="lower" name="play">
        <temp class="getKeys"></temp>
        <div class="add-key" name="play" onclick="addKeyToAction(this);">Add</div>
    </div>
</div>
`;

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