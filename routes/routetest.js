const fp = require("fastify-plugin")

async function testRoute(fastify, options) {
	fastify.get("/test", async (request, reply) => {
		reply.send({ message: "Hello World from Server" })
	})
	fastify.post("/test", async (request, reply) => {
		console.log("request body", request.body)
		reply.send({ message: "Hello World from Server" })
	})
}

module.exports = fp(testRoute)
