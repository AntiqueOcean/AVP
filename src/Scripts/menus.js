import { elementValidateById } from './basics.js';
import { addListener } from './listener.js';

export class listItem {
    constructor(type, isMain, name, style = "", input = "", func = null, children = [], id = "") {
        this.name = name;
        this.type = type;
        this.style = style;
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

export function closeTempMenu() {
    window.removeEventListener("click", closeTempMenu);
    window.removeEventListener("contextmenu", closeTempMenu);
    document.getElementById("currentTempMenu").innerHTML = '';
}

export function setBoundingVariables(elem) {
    var selfB = elem.getBoundingClientRect();
    var parentB = elem.parentElement.getBoundingClientRect();
    elem.style.setProperty('--var-x', selfB.x + 'px');
    elem.style.setProperty('--var-y', selfB.y + 'px');
    elem.style.setProperty('--var-w', selfB.width + 'px');
    elem.style.setProperty('--var-h', selfB.height + 'px');
    elem.style.setProperty('--var-local-x', (selfB.x - parentB.x) + 'px');
    elem.style.setProperty('--var-local-y', (selfB.y - parentB.y) + 'px');
}

export function generateListMenu(_event, itemList, _id = "", isMain = true, isInner = false, updateFunction = null) {
    if (updateFunction != null) {
        updateFunction();
    }
    var _items = [];
    const _list = itemList.children;
    var _result = "";
    if (isMain)
        _result = `<div class="list-menu" id="${_id}" style="--mouse-x: ${_event.clientX}px; --mouse-y: ${_event.clientY}px;">`;
    else if (!isMain && !isInner)
        _result = `<div class="list-menu child">`;

    for(var i = 0; i < _list.length; i++) {
        // label
        if (_list[i].type == "label") {
            _items[i] = `<label>${_list[i].name}</label>`;
        }
        else if (_list[i].type == "line") {
            _items[i] = `<hr/>`;
        }
        // div item & div small
        else if (_list[i].type == "item" || _list[i].type == "small item") {
            var _class = "";
            if (_list[i].type == "small item")
                _class = `class="small"`;
            if (_list[i].isParent)
                _class = `class="parent"`;
            var __id = "";
            if (_list[i].id != "")
                __id = `id="${_list[i].id}"`;
            _items[i] = `<div ${__id} ${_class} style="${_list[i].style}">${_list[i].name} `;
            const _event_ = _event;
            const listItem = _list[i];
            if (_list[i].children.length != 0) {
                _items[i] += generateListMenu(_event_, listItem, listItem.id + "_menu", false);

            elementValidateById(listItem.id, () => {
                addListener(listItem.id, "mouseover", function(e) {
                    e.stopPropagation();
                    setBoundingVariables(document.getElementById(listItem.id));
                }, ["!event"]);
            });
                    
            }
            if (_list[i].func != null) {
                elementValidateById(listItem.id, () => {
                    addListener(listItem.id, listItem.input, function(e) {
                        e.stopPropagation();
                        listItem.func();
                        closeTempMenu();
                    }, ["!event"]);
                });
                
            }
            
            _items[i] += `</div>`;
        }
        // ul
        else if (_list[i].type == "button group") {
            var __id = "";
            if (_list[i].id != "")
                __id = `id="${_list[i].id}"`;
            _items[i] = `<ul ${__id} style="${_list[i].style}">`;
            const _event_ = _event;
            const listItem = _list[i];
            if (_list[i].children.length != 0) {
                _items[i] += generateListMenu(_event_, listItem, listItem.id + "_menu", false, true); 
            }
            if (_list[i].func != null) {
                elementValidateById(listItem.id, () => {
                    addListener(listItem.id, listItem.input, listItem.func);
                });
                
            }
            
            _items[i] += `</ul>`;
        }
        // li
        else if (_list[i].type == "button") {
            var __id = "";
            if (_list[i].id != "")
                __id = `id="${_list[i].id}"`;
            _items[i] = `<li ${__id} style="${_list[i].style}">`;

            const listItem = _list[i];
            
            if (_list[i].func != null) {
                elementValidateById(listItem.id, () => {
                    addListener(listItem.id, listItem.input, listItem.func);
                });   
            }
            _items[i] += `</li>`;
        }
    }

    for (var i = 0; i < _items.length; i++) {
        _result += _items[i];
    }
    if (!isInner)
    _result += `</div>`;
    return _result;
}

export function createGeneratedListMenu(input) {
    closeTempMenu();
    document.getElementById("currentTempMenu").innerHTML = input;
    setTimeout(() => {
        window.addEventListener("click", closeTempMenu);
        window.addEventListener("contextmenu", closeTempMenu);
    }, 50);
}
