import 'dotenv/config'
import express from 'express';
import websocketConnection from './websocket/connect.js';
import StartSocket from './helper/screepsSocket.js';
import TestHelper from './testHelper/index.js';

const app = express();
const port = 5001;

const httpServer = app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

if (process.env.TESTING === 'TRUE') TestHelper.loadData();
else {
    websocketConnection(httpServer)
    StartSocket();
}

