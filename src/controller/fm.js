import forever from 'forever-monitor';

const child = new forever.Monitor('index.js', {
  silent: false,
  uid: 'index',
});

child.start(); 