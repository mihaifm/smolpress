const fs = require('fs');
const path = require('path');

function randomString(len) {
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var random = Array.from({ length: len }, () => {
    return possible[Math.floor(Math.random() * possible.length)];
  }).join('');

  return random;
}

function slugify(str) {
  str = str.replace(/^\s+|\s+$/g, '');
  str = str.toLowerCase();
  var from = "áäâàãåăčçćďéěëèêẽĕȇíìîïňñóöòôõøðřŕšșťțúůüùûýÿžþÞĐđßÆa·/_,:;";
  var to =   "aaaaaaacccdeeeeeeeeiiiinnooooooorrssttuuuuuyyzbBDdBAa------";
  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str.replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return str;
}

function clearFolder(path, keepList) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(file => {
      if (keepList && keepList.includes(file))
        return;
        
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { 
        clearFolder(curPath);
        fs.rmdirSync(curPath);
      } 
      else { 
        fs.unlinkSync(curPath);
      }
    });
  }
}

function copyFolderSync(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
      if (fs.lstatSync(path.join(from, element)).isFile()) {
          fs.copyFileSync(path.join(from, element), path.join(to, element));
      } else {
          copyFolderSync(path.join(from, element), path.join(to, element));
      }
  });
}

function isTextFile(filepath) {
  var pathObj = path.parse(filepath);
  if (['.txt', '.md', '.asc', '.csv', '.xml', '.text', '.yml']
    .includes(pathObj.ext))
      return true;

  return false;
}

module.exports = {
  randomString, 
  slugify,
  isTextFile,
  clearFolder,
  copyFolderSync
};