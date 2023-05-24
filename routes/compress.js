const fp = require("fastify-plugin")
const fs = require("fs-extra")
const path = require("path")
const contentDisposition = require("content-disposition")
const pump = require("pump")
const archiver = require("archiver")

async function compressRoute(fastify, options) {
  fastify.post("/compress", async (request, reply) => {
    fastify.connectionStore.broadcastMessage({
      msg: "Starte ZIP-Komprimierung...",
    })
    try {
      const fullPath = request.body.path
      console.log("fullpath:", fullPath)
      const currentDirectoryName = path.basename(fullPath)
      const fileName = `${currentDirectoryName}.zip`
      // Store the output zip file outside of the directory being compressed
      const outputPath = path.join(fullPath, "..", fileName)

      await compressDirectory(fullPath, outputPath)
      console.log("zip: ", outputPath)
      reply.code(200).send({
        message: "Zip-Datei erfolgreich erstellt.",
        zipUrl: outputPath,
      })
      // reply
      //   .header("Content-Type", "application/zip")
      //   .header("Content-Disposition", `attachment; filename=${fileName}`)
      //   .send(fs.createReadStream(outputPath))
    } catch (error) {
      reply.code(500).send({ error: "ZIP-Komprimierung fehlgeschlagen." })
    }
  })

  const compressDirectory = async (directoryPath, outputPath) => {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath)
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Sets the compression level.
      })

      output.on("close", () => {
        console.log("output closed")
        resolve()
      })

      archive.on("error", (err) => reject(err))

      archive.on("finish", () => {
        console.log("compression finished")
      })

      archive.pipe(output)
      archive.directory(directoryPath, false)
      archive.finalize()
    })
  }

  fastify.get("/download", async (request, reply) => {
    console.log("raw zip location: ", request.query.zipLocation)
    try {
      const zipLocation = request.query.zipLocation
      // Buffer.from(
      //   request.query.zipLocation,
      //   "base64"
      // ).toString("utf-8")
      console.log("zipLocation:", zipLocation)

      if (!fs.existsSync(zipLocation)) {
        console.log("file not found")
        reply.code(404).send({ error: "File not found." })
        return
      }

      const fileName = path.basename(zipLocation)
      console.log("fileName:", fileName)
      reply
        .header("Content-Type", "application/zip")
        .header("Content-Disposition", contentDisposition(encodeURI(fileName)))

      const stream = fs.createReadStream(zipLocation)
      reply.hijack()
      pump(stream, reply.raw, (err) => {
        if (err) {
          console.error("Error while sending the stream:", err)
          reply.raw.destroy()
        }
      })
    } catch (error) {
      reply.code(500).send({ error: "Failed to download the file." })
    }
  })
}

module.exports = fp(compressRoute)
