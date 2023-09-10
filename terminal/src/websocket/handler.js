import TerminalStoreBroker from "../broker/terminalStore.js"

const clients = {}
export default function handleConnection(socket) {
  clients[socket.id] = { connected: true }

  socket.on('terminal', json => {
    const data = JSON.parse(json)

    TerminalStoreBroker.receiveTerminalData(data)
  })
}