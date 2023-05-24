const fp = require("fastify-plugin")
const fs = require("fs-extra")
const path = require("path")
const sanitize = require("sanitize-filename")

async function uploadRoute(fastify, options) {
  fastify.post("/upload", async function (request, reply) {
    const { PUBLIC_DIR } = options
    try {
      fastify.connectionStore.broadcastMessage({
        msg: "Dokument wird hochgeladen...",
      })
      const file = await request.file()
      console.log("file", file.file)
      if (!file) {
        throw new Error("No file uploaded")
      }
      console.log("mime", file.mimetype)
      if (
        file.mimetype !==
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        throw new Error("Invalid file type")
      }

      const nameWithoutExt = sanitize(path.parse(file.filename).name)
      const dir = `output/${nameWithoutExt}`

      const uploadDir = path.join(PUBLIC_DIR, dir)
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const savePath = path.join(uploadDir, file.filename)
      await fs.promises.writeFile(savePath, file.file)

      reply.status(200).send({
        message: "Dokument erfolgreich upgeloadet.",
        status: "success",
        path: uploadDir,
        filename: file.filename,
      })
    } catch (error) {
      reply.status(500).send({ message: error.message })
    }
  })
}

module.exports = fp(uploadRoute)
