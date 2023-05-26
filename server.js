const fs = require("fs-extra")
const path = require("path")
const serveHandler = require("serve-handler")
const envToLogger = {
  development: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "SYS:dd.mm.yyyy HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  },
  production: true,
  test: false,
}
const fastify = require("fastify")({
  logger: envToLogger["development"] ?? true,
})

const PUBLIC_DIR = path.join(__dirname, "public")
fastify.decorateRequest("PUBLIC_DIR", PUBLIC_DIR)

const PROJECT_DIR = path.join(PUBLIC_DIR, "output")

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true })
}
// fastify.addHook("preHandler", (request, reply, done) => {
//   if (!request.headers.accept) {
//     request.headers.accept = "text/html; charset=utf-8"
//   }
//   done()
// })
fastify.register(require("./server/connectionStore"))
fastify.register(require("./routes/test"))
fastify.register(require("./routes/upload"), { PUBLIC_DIR })
fastify.register(require("./routes/parse"), { PUBLIC_DIR })
fastify.register(require("./routes/compress"))
fastify.register(require("./routes/preview"), {
  PROJECT_DIR,
  PUBLIC_DIR,
})

// module.exports = function (fastify, ops, next) {
//   next()
// }

// fastify.register(require("@fastify/http-proxy"), {
//   upstream: "http://127.0.0.1:8081",
//   prefix: "/preview",
//   http2: false,
// })

fastify.register(require("@fastify/multipart"), {
  // attachFieldsToBody: true,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
})
fastify.register(require("@fastify/websocket"))
// Defining websoclket route
fastify.register(async function (fastify) {
  fastify.route({
    method: "GET",
    url: "/log",
    handler: (request, reply) => {
      reply.send("This is a WebSocket route")
    },
    wsHandler: (connection, request) => {
      console.log("client connected")
      connection.socket.send(
        JSON.stringify({ msg: "Verbindung zum Server hergestellt." })
      )
      connection.socket.on("message", (message) => {
        console.log(`Received message: ${message}`)
      })

      fastify.connectionStore.addConnection(connection.socket)
      connection.socket.on("close", () => {
        fastify.connectionStore.removeConnection(connection.socket)
      })
    },
  })
})

fastify.all("/*", async (request, reply) => {
  const folder = path.join(__dirname, ".next")
  if (process.env.NODE_ENV === "production") {
    await serveHandler(reply.raw, request.raw, {
      public: folder,
    })
  } else {
    reply.status(404).send("Not found")
  }
})
// Run the server!

// if (process.env.NODE_ENV === "production") {

fastify.listen(
  { port: process.env.PORT || 5000, host: "0.0.0.0" },
  (err, address) => {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    } else {
      fastify.log.info(`Server listening on ${address}`)
    }
  }
)
// }
