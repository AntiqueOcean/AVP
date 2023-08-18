const { dialog, electron, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const vThumb = require('@rajesh896/video-thumbnails-generator');

var GetFileBlobUsingURL = function (url, convertBlob) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.addEventListener('load', function() {
        convertBlob(xhr.response);
    });
    xhr.send();
};

var blobToFile = function (blob, name) {
    blob.lastModifiedDate = new Date();
    blob.name = name;
    return blob;
};

var GetFileObjectFromURL = function(filePathOrUrl, convertBlob) {
   GetFileBlobUsingURL(filePathOrUrl, function (blob) {
      convertBlob(blobToFile(blob, path.parse(filePathOrUrl).base));
   });
};
var previewArray;
function generatePreview(input, length = 20){
    previewArray = [];

    var file;
    GetFileObjectFromURL(input, function (fileObject) {
        file = fileObject;
    });

    const _localInterval = setInterval(function () {
        if (file != undefined) {
            vThumb.generateVideoThumbnails(file, length).then((thumbArray) => {
                previewArray = thumbArray;

            }).catch((err) => {
                console.error(err);
            });

            clearInterval(_localInterval);
        }
    }, 25);
}


function play(input) {
    var _src;
    if (input == "err" || input == "e" || input == "error")
        _src = "temp/err.mp3";
    else if (input == "ding" || input == "done")
        _src = "temp/done.mp3";
    else
        _src = "temp/done.mp3";
    const audio = document.getElementById("audio")
    audio.setAttribute("src", _src);
    audio.play();
}

ipcRenderer.on("bg_generatePreview", (event, input, length = 20) => {
    generatePreview(input, length);
    const _localInterval2 = setInterval(() => {
        if (previewArray.length != 0){
            // play("done");
            ipcRenderer.invoke("generatedPreviewResult", previewArray);
            clearInterval(_localInterval2);
        }
    }, 250);
});
