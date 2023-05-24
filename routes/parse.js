const fp = require("fastify-plugin")
const fs = require("fs-extra")
const path = require("path")
const { exec } = require("child_process")

async function parseRoute(fastify, options) {
  fastify.post("/parse", async function (request, reply) {
    try {
      console.log("parse body", request.body)
      fastify.connectionStore.broadcastMessage({
        msg: "Dokument wird verarbeitet...",
      })
      const buildDir = request.body.mode === "preview" ? "preview" : "build"
      const { filename, dirPath } = request.body
      const basePath = path.basename(dirPath)
      console.log("BASEPATH!!!!!", basePath)
      if (!fs.existsSync(`${dirPath}/${buildDir}`)) {
        fs.mkdirSync(`${dirPath}/${buildDir}`, { recursive: true })
        fs.chmod(`${dirPath}/${buildDir}`, 0o775, (err) => {
          if (err) {
            console.error(err)
          }
        })
      }
      await exec(`cp -r ./public/template/. ${dirPath}/${buildDir}`) // Copy template files
      await exec(`npm install --prefix ${dirPath}/${buildDir}`) // Install dependencies
      fastify.connectionStore.broadcastMessage({
        msg: "Files aus dem Template kopiert...",
      })
      await exec(
        `./server/office-parser/parse.mjs -n ${dirPath}/${buildDir}/src ${dirPath}/${filename}`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`)
            return
          }
          if (stderr) {
            console.log(`stderr: ${stderr}`)
            return
          }
          // console.log(`stdout: ${stdout}`)
          console.log("data type", typeof stdout)
          // Send log message to connected clients
          fastify.websocketServer.clients.forEach((client) => {
            console.log("sending to client")
            const logLines = stdout.split("\n")
            logLines.forEach((logLine) => {
              if (logLine.trim() !== "") {
                try {
                  const logObject = JSON.parse(logLine)
                  client.send(
                    JSON.stringify({
                      event: "parselog",
                      body: logObject,
                    })
                  )
                } catch (parseError) {
                  console.error("Error parsing log line:", parseError)
                }
              }
            })
            // client.send(JSON.stringify(stdout))
          })
          buildSite(dirPath, request.body, buildDir)
        }
      )
      reply.status(200).send({
        message: "Dokument erfolgreich verarbeitet.",
        status: "success",
        path: dirPath,
        pathName: basePath,
      })
    } catch (error) {
      reply.status(500).send({ message: error.message })
    }
  })

  const replaceSettings = async (body, buildDir, buildName) => {
    try {
      const folder = body.dirPath
      fs.readFile(
        `${folder}/${buildDir}/src/_data/project.js`,
        "utf8",
        function (err, data) {
          if (err) {
            return console.log("settings error: ", err)
          }
          /* 
        Überschreibe optionale und erforderliche Felder aus dem Frontend.
        Falls Felder erweitert werden: 
        - innerhalb des Formulars (im Frontend) erweitern und
        - project.js (Pfad: /raw/src/_data/project.js) muss ebenfalls erweitert werden und
        - var result = result.replace(/XXX_XXX/g, `"${body.xxx_xxx}"`); muss ebenfalls erweitert werden!
        -- ACHTUNG: result kann "string" oder boolean Werte haben
        */
          let result = data

          result = result.replace(/STAGE_TITLE/g, `"${body.stage_title}"`)
          result = result.replace(/STAGE_DESC/g, `"${body.stage_description}"`)
          result = result.replace(/SITE_COLOR/g, `"${body.site_color}"`)
          result = result.replace(/SITE_DESC/g, `"${body.site_description}"`)
          // HEADER_MENU option has to be Boolean
          result = result.replace(/HEADER_MENU/g, `${body.header_menu}`)
          // SKIP_FIRST_CHAPTER option has to be Boolean
          result = result.replace(
            /SKIP_FIRST_CHAPTER/g,
            `${body.skip_first_chapter}`
          )
          result = result.replace(/SITE_LANG/g, `"${body.site_lang}"`)

          if (body.site_search == "hidden") {
            result = result.replace(/SITE_SEARCH/g, `"${body.site_search}"`)
          } else {
            result = result.replace(/SITE_SEARCH/g, `${body.site_search}`)
          }
          if (buildDir === "preview") {
            result = result.replace(
              /SITE_TITLE/g,
              `"${body.site_title} [Vorschau]"`
            )
            result = result.replace(/SITE_PATH/g, `"preview/${buildName}/"`)
            result = result.replace(/SITE_IMPROVE/g, "false")
          } else {
            result = result.replace(/SITE_TITLE/g, `"${body.site_title}"`)
            result = result.replace(/SITE_IMPROVE/g, "true")
            if (body.site_path) {
              result = result.replace(/SITE_PATH/g, `"${body.site_path}"`)
            } else {
              result = result.replace(/SITE_PATH/g, "'/'")
            }
          }
          // Die Datei project.js wird mit den nun ersetzten Daten, kommend aus dem Frontend, beschrieben.
          fs.writeFile(
            `${folder}/${buildDir}/src/_data/project.js`,
            result,
            "utf8",
            function (err) {
              if (err) return console.log(err)
            }
          )
        }
      )
      return
    } catch (err) {
      console.log(err)
    }
  }

  const rewritePaths = async (folder) => {
    fs.readFile(`${folder}/.eleventy.js`, "utf8", function (err, data) {
      if (err) {
        return console.log(err)
      }

      var result = data.replace(/REPLACEME/g, `"${folder}"`)

      fs.writeFile(`${folder}/.eleventy.js`, result, "utf8", function (err) {
        if (err) return console.log(err)
      })
    })
  }

  const buildSite = async (dirPath, settingsToReplace, buildDir) => {
    try {
      const buildPath = path.join(dirPath, buildDir)
      const buildName = path.basename(dirPath)
      fastify.connectionStore.broadcastMessage({
        msg: "Starte Eleventy Build...",
      })
      await replaceSettings(settingsToReplace, buildDir, buildName)
      console.log("between replaced settings", buildPath)
      await rewritePaths(buildPath)
      console.log("after replaced settings")
      const eleventyConfigPath = path.join(buildPath, ".eleventy.js")
      console.log("Eleventy config path:", eleventyConfigPath)
      const srcFolder = path.join(buildPath, "src")
      const siteFolder = path.join(buildPath, "_site")
      // const elev = new Eleventy(srcFolder, siteFolder, {
      //   quietMode: false,
      //   configPath: eleventyConfigPath,
      // })

      console.log("Eleventy build started...")
      const eleventyCmd = `npx @11ty/eleventy --input=${srcFolder} --output=${siteFolder} --config=${eleventyConfigPath}`

      exec(eleventyCmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing Eleventy: ${error.message}`)
          return
        }

        console.log(stdout)
        console.log("Eleventy build completed successfully.")
        fastify.connectionStore.broadcastMessage({
          previewPath: buildName,
          msg: "Eleventy Build erfolgreich abgeschlossen.",
        })
        if (stderr) {
          console.error(stderr)
        }
      })
      // await elev.write()
    } catch (error) {
      return "Failed to build Eleventy site: " + error.message
    }
  }
}

module.exports = fp(parseRoute)
