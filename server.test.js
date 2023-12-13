const fs = require("fs-extra")
const path = require("path")
const buildServer = require("./server")

describe("Server", () => {
	let app

	beforeAll(async () => {
		app = buildServer()
		await app.ready() // Ensure the server is ready before starting tests
	})

	afterAll(async () => {
		await app.close()
	})

	it("should respond with 200 status code for root path", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/",
		})

		expect(response.statusCode).toBe(200)
	})

	it("should create the public directory if it doesn't exist", async () => {
		const publicDir = path.join(__dirname, "public")

		expect(fs.existsSync(publicDir)).toBe(true)
	})
})
