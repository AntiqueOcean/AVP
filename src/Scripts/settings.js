/* Copyright (C) 2023 antiqueOcean <antiqueocean.dev@gmail.com> - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential.
 */
console.log(213);

/* ------------ ---------- ------------ */
/* ------------ [Settings] ------------ */
/* ------------ ---------- ------------ */
//import { config } from './main.js';

import * as basic from './basics.js';
import * as listen from './listener.js';
import * as menu from './menus.js';

function getKeysForActions() {
    alert(key.play[0]);
    let _keys = document.getElementsByClassName("getKeys");
    for (var i = 0; i < _keys.length; i++) {

        var _key = key.play;

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

listen.addListener("inputButton", "click", function(){
    setSettingsContent("input");
});

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