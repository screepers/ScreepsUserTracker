import express from 'express';
import websocketConnection from './websocket/connect.js';

const app = express();
const port = 5001;

const httpServer = app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
websocketConnection(httpServer)