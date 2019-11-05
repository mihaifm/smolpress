#!/usr/bin/env node
const builder = require('./lib/builder.js');

function cliProcess(input) {
  var command = input.length > 0 ? input[0] : null;

  if (command == 'init') {
    builder.makeApp();
  }
  else if (command == 'start') {
    require('child_process').fork('index.js');
  }
  else if (command == 'build') {
    builder.build();
  }
  else if (command == 'update') {
    builder.makeApp();
  }
  else {
    console.log('Invalid command');
  }
}

cliProcess(process.argv.slice(2));