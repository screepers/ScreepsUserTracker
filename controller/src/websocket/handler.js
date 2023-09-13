import ProcessDataBroker from "../data/broker/processData.js"
import DataRequestsBroker from "../data/broker/requests.js"

const clients = {}
export default function handleConnection(socket) {
  clients[socket.id] = { connected: true }

  socket.on('data', json => {
    const roomData = JSON.parse(json)
    ProcessDataBroker.single(roomData)
  })

  socket.on('request', () => {
    const request = DataRequestsBroker.getFirstRequest()
    socket.emit('request', JSON.stringify(request))
  })
}