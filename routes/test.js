const fp = require("fastify-plugin")

async function testRoute(fastify, options) {
  fastify.get("/test", async (request, reply) => {
    reply.send({ message: "Hello World TEST" })
  })
}

module.exports = fp(testRoute)
