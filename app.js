const buildServer = require("./server")

const server = buildServer()

server.listen(
	{ port: process.env.PORT || 5000, host: "0.0.0.0" },
	(err, address) => {
		if (err) {
			server.log.error(err)
			process.exit(1)
		} else {
			server.log.info(`Server listening on ${address}`)
		}
	}
)
