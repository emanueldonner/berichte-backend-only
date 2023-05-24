#!/usr/bin/env node

import fs from "fs"
import path from "path"

import commandLineArgs from "command-line-args"

import Docx from "./docx/docx.js"
import {
  mkdirhir,
  makeLog,
  getLog,
  initTextTraceOut,
  textTraceOut,
} from "./lib/lib.js"
import Parser from "./parser/parser.js"
import Nunjucks from "./nunjucks/nunjucks.js"

let cla = commandLineArgs([
  { name: "inputFile", type: String, alias: "i", defaultOption: true },
  { name: "htmlOut", type: String, alias: "H" },
  { name: "docxOut", type: String, alias: "x" },
  { name: "nunjucksOut", type: String, alias: "n" },
  { name: "logLevel", type: String, alias: "L", defaultValue: "info" },
  { name: "logPrettyPrint", type: Boolean, alias: "P", defaultValue: false },
  { name: "textTrace", type: String, alias: "T" },
  { name: "help", type: Boolean, alias: "h", defaultValue: false },
])

function cliUsage() {
  let u =
    "Synopsis: parse.mjs [ -H dir1 ] [ -x dir2 ] [ -n dir3 ] [-L level] [-P] [-h] [-T tracefile] [-i] input.docx"

  u += "\nSee README.md for more details"

  console.log(u)
}

function cleanupImages(dir) {
  fs.readdirSync(dir).forEach((f) => fs.rmSync(`${dir}${path.sep}${f}`))
}

function cleanupChapters(dir) {
  fs.readdirSync(dir).forEach(
    (f) =>
      f.match(/^chapter_[0-9]{3}$/) &&
      fs.rmSync(`${dir}${path.sep}${f}`, { recursive: true })
  )
}

async function doit(cla) {
  makeLog(cla)
  initTextTraceOut(cla)

  let log = getLog()
  let textTrace = cla.textTrace ? true : false

  if (cla.help) {
    cliUsage()
    return 0
  }

  try {
    log.info({ loc: "45c075" }, "starting up")

    if (!cla.inputFile) {
      log.fatal({ loc: "56efcc" }, "No input file specified")
      return 1
    }

    if (!(cla.htmlOut || cla.docxOut || cla.nunjucksOut || cla.textTrace)) {
      log.error(
        { loc: "cd547f" },
        "One of the options H, x, n or T must be specified"
      )
      return 1
    }

    let docx = new Docx(cla.inputFile)
    if (docx.constructorError) {
      return 1
    }
    let parser = new Parser(docx)
    let pi = path.parse(cla.inputFile)

    if (cla.docxOut) {
      mkdirhir(cla.docxOut)
      await docx.outputXml(cla.docxOut)
    }

    await parser.parse({ textTrace })

    if (cla.htmlOut) {
      mkdirhir(cla.htmlOut)
      docx.outputPics(cla.htmlOut)
      let output = fs.openSync(`${cla.htmlOut}${path.sep}document.html`, "w")
      fs.writeSync(output, "<html><body>")
      parser
        .getParseResult()
        .forEach((p) => fs.writeSync(output, p.toHtml() + "\n"))
      fs.writeSync(output, "</body></html>")
      fs.closeSync(output)
    }

    if (cla.nunjucksOut) {
      let img = `${cla.nunjucksOut}${path.sep}images`
      let kap = `${cla.nunjucksOut}${path.sep}pages${path.sep}kapitel`
      let dat = `${cla.nunjucksOut}${path.sep}_data`
      let nunjucks = new Nunjucks(parser.getParseResult())
      mkdirhir([img, kap, dat])
      cleanupImages(img)
      cleanupChapters(kap)
      await docx.outputPics(img)
      nunjucks.output({ toplevel: kap, textTrace })
      nunjucks.outputJson(dat)
    }
  } catch (e) {
    log.error({ loc: "bdef9f", err: e }, "uncought exception")
    return 1
  }

  return 0
}

doit(cla).then((r) => process.exit(r))
