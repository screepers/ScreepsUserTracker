const clients = {}
export default function handleConnection(socket) {
  clients[socket.id] = { connected: true }

  socket.on('terminal', json => {
    const data = JSON.parse(json)
  })
}