const vault = require('./vault.js');

var records = vault.init();

exports.findById = (id, cb) => {
  process.nextTick(() => {
    var idx = id - 1;
    if (records[idx]) {
      cb(null, records[idx]);
    } else {
      cb(new Error('User ' + id + ' does not exist'));
    }
  });
}

exports.findByUsername = (username, cb) => {
  process.nextTick(() => {
    for (var i = 0, len = records.length; i < len; i++) {
      var record = records[i];
      if (record.username === username) {
        return cb(null, record);
      }
    }
    return cb(null, null);
  });
}

exports.empty = () => {
  return (records.length == 0);
}

exports.create = (username, password) => {
  var maxid = 0;
  for (var i = 0; i < records.length; i++) {
    if (records[i].id && records[i].id > maxid)
      maxid = records[i];
  }
  maxid++;

  var {salt, hash} = vault.hashPassword(password);
  var user = {username: username, salt: salt, password: hash, id: maxid};
  records.push(user);
  vault.update(records);
}

exports.validate = (user, password) => {
  return vault.validPassword(user.password, user.salt, password);
}