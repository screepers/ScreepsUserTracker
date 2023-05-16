import forever from 'forever-monitor';

const child = new forever.Monitor('src/index.js', {
  silent: false,
  uid: 'index',
});

child.start(); 