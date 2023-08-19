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
var key = null;
var isSettingKey = false;
var settingKeyListener = null;
var settingKey;
const content = document.getElementById("content");

ipcRenderer.on("reciveData", (event, _config, _key) => {
    config = _config;
    key = _key;
    init();

});


const localPath = ipcRenderer.sendSync("getLocalPath");


const path = require('path');
const fs = require('fs');

function init(){
    basic.setTheme(config.theme, config, false);
}


class item {
    constructor(_content, IDs = [], triggers = [], functions = [], passing = []) {
        this.content = _content;
        this.IDs = IDs;
        this.triggers = triggers;
        this.functions = functions;
        this.passing = passing;
    }
};

class keyData {
    constructor(id, name, index) {
        this.id = id;
        this.name = name;
        this.index = index;
    }
};

var keyItems = [];

function generateKeyItems() {
    keyItems = [];
    for (var i = 0; i < Object.keys(key).length; i++) {
        const _index = i;
        keyItems[_index] = new item(`
        <h2>${Object.keys(key)[_index]}</h2>
        <hr/>` + makeElementsForKeyInput(key[[Object.keys(key)[_index]]], Object.keys(key)[_index]) +
        `<div class="spacer"></div>
        <button id="addkey_${Object.keys(key)[_index]}">Add</button>
        `);
    }
}

function generateInputMenu() {
    generateKeyItems();
    return generateItemList(keyItems);
}

window.addEventListener("click", function(e){
    if (e.target.id.includes("addkey_")) {
        const _name = e.target.id.replace("addkey_", "");
        addKey(_name);
        const _content = generateInputMenu();
        content.innerHTML = _content;
    }
})

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
    ipcRenderer.invoke("closeSettings", config, key);
});

listen.addListener("close", "click", function(){
    ipcRenderer.invoke("closeSettings", null);
});

listen.addListener("inputButton", "click", function(){
    setTitle("input");
    const _content = generateInputMenu();
    content.innerHTML = _content;
});

listen.addListener("proxyButton", "click", function(){
    setTitle("proxy");
    const _content = generateInputMenu();
    content.innerHTML = _content;
});

function makeElementsForKeyInput(input, name) {
    var _content = "";
    for (var i = 0; i < input.length; i++) {
        const _id = "key_" + name + "_" + i;
        const del_id = "delkey_" + name + "_" + i
        _content += `<div id="${_id}" class="key">${input[i]}
        <button id="${del_id}">del</button>
        </div>` 
        const _index = i;
        basic.elementValidateById(_id, function(){
            listen.addListener(_id, "click", function(){
                editKey(_id, name, _index);
            })
        }, 25);
        basic.elementValidateById(del_id, function(){
            listen.addListener(del_id, "click", function(e){
                e.stopPropagation();
                deleteKey(_id, name, _index);
            }, ["!event"])
        }, 25);
    }
    return _content;
}

function addKey(name, input="none") {
    key[name].push(input);
}

window.onkeydown = function(e) {
    const code = e.code;
    if (isSettingKey) {
        if(code != "Backspace") {
            key[settingKey.name][settingKey.index] = code;
            const _content = generateInputMenu();
            content.innerHTML = _content;
            isSettingKey = false;
        } else {
            const _content = generateInputMenu();
            content.innerHTML = _content;
            isSettingKey = false;
        }
    }
}

function editKey(_id, _name, _index) {
    settingKey = new keyData(_id, _name, _index);
    document.getElementById(_id).innerHTML = document.getElementById(_id).innerHTML.replace(key[_name][_index], "Press_Key")
    isSettingKey = true;
}

function deleteKey(_id, name, _index) {
    key[name].splice(_index, 1);
    document.getElementById(_id).remove();
}

function setTitle(input = undefined) {
    if (input != "" && input != undefined) {
        document.getElementById("title").innerHTML = "Settings | " + input;
        document.getElementById("settingsTitlebar").innerHTML = "Settings | " + input;
    }
    else {
        document.getElementById("title").innerHTML = "Settings";
        document.getElementById("settingsTitlebar").innerHTML = "Settings";
    }
}