const fs = require('fs');
const crypto = require('crypto');
const builder = require('./builder.js');

const vaultname = `${builder.dirs.data}/vault.txt`;
const vaultvar = 'SMOL_VAULT_PASSWORD';
const vaultpwd = process.env[vaultvar];

function init() {
  if (!(vaultvar in process.env)) {
    console.log(`${vaultvar} environment variable not set`);
    process.exit(1);
  }

  var records = [];
  if (fs.existsSync(vaultname)) {
    records = JSON.parse(decrypt(fs.readFileSync(vaultname, 'utf8')));
  }
  else {
    if (!fs.existsSync(builder.dirs.data))
      fs.mkdirSync(builder.dirs.data);

    fs.writeFileSync(vaultname, encrypt(JSON.stringify(records)));
  }

  return records;
}

function update(records) {
  fs.writeFileSync(vaultname, encrypt(JSON.stringify(records)));
}

function encrypt(text) {
  var hash = crypto.createHash('sha256');
  hash.update(vaultpwd);
  const encryptionKey = hash.digest('hex');

  var iv = crypto.randomBytes(16);
  var cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
  var encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  var hash = crypto.createHash('sha256');
  hash.update(vaultpwd);
  const encryptionKey = hash.digest('hex');

  var textParts = text.split(':');
  var iv = Buffer.from(textParts.shift(), 'hex');
  var encryptedText = Buffer.from(textParts.join(':'), 'hex');
  var decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
  var decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

function hashPassword(password) {
  var salt = crypto.randomBytes(16).toString('hex');
  var hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');

  return { salt, hash };
}

function validPassword(savedHash, savedSalt, password) {
  var hash = crypto.pbkdf2Sync(password, savedSalt, 10000, 64, 'sha512').toString('hex');
  return savedHash == hash;
}

module.exports = {init, update, encrypt, decrypt, hashPassword, validPassword}
