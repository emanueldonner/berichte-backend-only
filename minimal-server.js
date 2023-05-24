const envToLogger = {
  development: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "SYS:dd.mm.yyyy HH:MM:ss",
        // ignore: "pid,hostname",
      },
    },
  },
  production: true,
  test: false,
}
const fastify = require("fastify")({
  logger: envToLogger["development"] ?? true,
})
const path = require("path")
const fs = require("fs-extra")

const PUBLIC_DIR = path.join(__dirname, "public")
fastify.decorateRequest("PUBLIC_DIR", PUBLIC_DIR)

const PROJECT_DIR = path.join(PUBLIC_DIR, "output")

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true })
}

fastify.register(require("./routes/preview"), {
  PROJECT_DIR,
  PUBLIC_DIR,
})
fastify.listen({ port: process.env.PORT || 5500 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})
