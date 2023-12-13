const fs = require("fs-extra")
const path = require("path")
const serveHandler = require("serve-handler")
const fastify = require("fastify")

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

const PUBLIC_DIR = path.join(__dirname, "public")
const PROJECT_DIR = path.join(PUBLIC_DIR, "output")

module.exports = function buildServer(options = {}) {
	const app = fastify({
		logger: envToLogger[process.env.NODE_ENV] ?? true,
		...options,
	})

	app.decorateRequest("PUBLIC_DIR", PUBLIC_DIR)

	if (!fs.existsSync(PUBLIC_DIR)) {
		fs.mkdirSync(PUBLIC_DIR, { recursive: true })
	}

	app.register(require("./server/connectionStore"))
	app.register(require("./routes/routetest"))
	app.register(require("./routes/upload"), { PUBLIC_DIR })
	app.register(require("./routes/parse"), { PUBLIC_DIR })
	app.register(require("./routes/compress"))
	app.register(require("./routes/preview"), {
		PROJECT_DIR,
		PUBLIC_DIR,
	})

	app.register(require("@fastify/multipart"), {
		limits: {
			fileSize: 100 * 1024 * 1024, // 100MB
		},
	})
	app.register(require("@fastify/websocket"))
	// Defining websoclket route
	app.register(async function (app) {
		app.route({
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

				app.connectionStore.addConnection(connection.socket)
				connection.socket.on("close", () => {
					app.connectionStore.removeConnection(connection.socket)
				})
			},
		})
	})

	app.get("/", async (request, reply) => {
		return { hello: "world" }
	})

	app.all("/*", async (request, reply) => {
		const folder = path.join(__dirname, ".next")
		if (process.env.NODE_ENV === "production") {
			await serveHandler(reply.raw, request.raw, {
				public: folder,
			})
		} else {
			reply.status(404).send("Not found")
		}
	})

	return app
}
