const filters = require("./_11ty/filters.js")
const fs = require("fs-extra")
const project = require("./src/_data/project.js")
const chapters = require("./src/_data/chapters.json")
const slugify = require("slugify")
const basePath = REPLACEME
const sharp = require("sharp")
const { JSDOM } = require("jsdom")
const path = require("path")

// Function to process images
async function processImage(
  src,
  imgName,
  dest,
  formats = ["avif", "webp", "jpg"]
) {
  for (const format of formats) {
    console.log("DEST PATH:", dest)
    const outputPath = path.join(dest, `${imgName}.${format}`)
    console.log("OUTPUT PATH:", outputPath)
    let image = sharp(src)

    switch (format) {
      case "webp":
        image = image.webp()
        break
      case "avif":
        image = image.avif()
        break
      case "jpg":
        image = image.jpeg()
        break
      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    await image.toFile(outputPath)
  }
}

module.exports = function (eleventyConfig) {
  // Import filters
  Object.keys(filters).forEach((filterName) => {
    eleventyConfig.addFilter(filterName, filters[filterName])
  })

  console.log(chapters.length)
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]
    console.log(chapter.folder)
    eleventyConfig.addCollection(chapter.folder, function (collectionApi) {
      const index = parseInt(chapter.folder.split("chapter_")[1])

      var col = collectionApi.getFilteredByGlob(
        `${basePath}/src/pages/kapitel/${chapter.folder}/*.njk`
      )

      return col.map((item, idx) => {
        item.data.chapter = index
        item.data.subchapter = col[0].data.intro ? idx : idx + 1
        return item
      })
    })
  }

  eleventyConfig.addCollection("chapters", function (collectionApi) {
    return collectionApi.getFilteredByGlob(
      `${basePath}/src/pages/kapitel/**/*.njk`
    )
  })

  eleventyConfig.addFilter("parentSlug", (page) => {
    const index = parseInt(
      page.filePathStem.match(/(?<=pages\/kapitel\/chapter_)(.*)(?=\/)/s)[0]
    )

    const options = {
      replacement: "-",
      strict: true,
      lower: true,
    }
    return slugify(chapters[index].title, options)
  })

  eleventyConfig.addFilter("quicklinks", (collection, index) => {
    return collection.map((item, idx) => {
      let chapterIndex = index + 1

      if (project.skipFirstChapter) {
        chapterIndex = index
      }

      let heading = `${chapterIndex}.${
        collection[0].data.intro ? idx : idx + 1
      } ${item.data.title}`

      if (project.skipFirstChapter && index === 0) {
        heading = item.data.title
      }

      if (item.data.intro) {
        heading = `${item.data.title}`
      }

      // const url = project.site_base_path + item.url
      const url = item.url

      return {
        text: heading,
        url: url.replace("//", "/"),
      }
    })
  })

  eleventyConfig.addFilter("chapterPrefix", (text, index, subindex) => {
    let chapterPrefix = `${index + 1}. `

    if (subindex > 0) {
      chapterPrefix = `${index + 1}.${subindex} `
    }

    if (project.skipFirstChapter) {
      chapterPrefix = `${index}. `

      if (subindex > 0) {
        chapterPrefix = `${index}.${subindex} `
      }

      if (index === 0) {
        chapterPrefix = ""
      }
    }

    return `${chapterPrefix}${text}`
  })

  // 404 page
  eleventyConfig.setBrowserSyncConfig({
    callbacks: {
      ready: function (err, bs) {
        bs.addMiddleware("*", (req, res) => {
          const content_404 = fs.readFileSync("_site/404.html")
          // Provides the 404 content without redirect.
          res.write(content_404)
          // Add 404 http status code in request header.
          // res.writeHead(404, { "Content-Type": "text/html" });
          res.writeHead(404)
          res.end()
        })
      },
    },
  })

  // Files to copy
  eleventyConfig.addPassthroughCopy({ [`${basePath}/src/images`]: "images" })
  eleventyConfig.addPassthroughCopy({
    [`${basePath}/src/images_static`]: "images_static",
  })
  eleventyConfig.addPassthroughCopy({ [`${basePath}/src/files`]: "files" })
  eleventyConfig.addPassthroughCopy({ [`${basePath}/src/assets`]: "assets" })

  // Process images

  eleventyConfig.addTransform(
    "processImagesInHTML",
    async (content, outputPath) => {
      if (outputPath && outputPath.endsWith(".html")) {
        const dom = new JSDOM(content)
        const document = dom.window.document

        // Select all img tags that are not inside a picture tag
        const imgElements = [
          ...document.querySelectorAll("img:not(picture img)"),
        ]

        // Select img tags that are inside a picture tag but without optimized srcset siblings
        const pictureImgElements = [
          ...document.querySelectorAll("picture img"),
        ].filter((img) => {
          const sources = img.parentElement.querySelectorAll("source[srcset]")
          return !Array.from(sources).some((source) =>
            /\.(avif|webp)$/i.test(source.getAttribute("srcset"))
          )
        })

        const allImgElements = imgElements.concat(pictureImgElements)

        const siteImagesPath = path.join(__dirname, "_site", "images")
        const outputDir = path.join(siteImagesPath, "opt")

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true })
          fs.chmod(outputDir, 0o775, (err) => {
            if (err) {
              console.error(err)
            }
          })
        }

        for (const img of allImgElements) {
          const src = img.getAttribute("src")
          const imagePath = path.join(siteImagesPath, path.basename(src))

          if (fs.existsSync(imagePath)) {
            if (src && !src.startsWith("http") && !src.startsWith("data:")) {
              const srcPath = path.join(
                __dirname,
                "/_site",
                "images",
                path.basename(src)
              )

              const baseName = path.basename(src, path.extname(src))
              const formats = ["avif", "webp", "jpg"]
              try {
                await processImage(srcPath, baseName, outputDir, formats)

                const picture = dom.window.document.createElement("picture")
                img.replaceWith(picture)

                for (const format of formats) {
                  const source = dom.window.document.createElement("source")
                  source.setAttribute("type", `image/${format}`)
                  source.setAttribute(
                    "srcset",
                    path.join(path.dirname(src), "opt", `${baseName}.${format}`)
                  )
                  picture.appendChild(source)
                }

                picture.appendChild(img)
              } catch (e) {
                console.log(`Error processing image ${srcPath}: ${e}`)
              }
            }
          } else {
            console.log(`Image not found: ${imagePath}`)
          }
        }

        return dom.serialize()
      }

      return content
    }
  )

  return {
    pathPrefix: project.pathPrefix,
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    transforms: ["processImagesInHTML"],
  }
}
