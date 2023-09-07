import websocket from 'socket.io'
import handleConnection from './handler.js'

export default function websocketConnection(httpServer) {
  const io = websocket(httpServer, {
    serveClient: false
  })
  io.on('connection', socket => handleConnection(socket))
}