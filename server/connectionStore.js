const WebSocket = require("ws")
const fp = require("fastify-plugin")

// connectionStore.js
let connections = new Set()

function addConnection(connection) {
  connections.add(connection)
}

function removeConnection(connection) {
  connections.delete(connection)
}

function broadcastMessage(message) {
  const messageString = JSON.stringify(message)
  connections.forEach((connection) => {
    if (connection.readyState === WebSocket.OPEN) {
      connection.send(messageString)
    }
  })
}

async function connectionStorePlugin(fastify, options) {
  fastify.decorate("connectionStore", {
    addConnection,
    removeConnection,
    broadcastMessage,
  })
}
module.exports = fp(connectionStorePlugin)
