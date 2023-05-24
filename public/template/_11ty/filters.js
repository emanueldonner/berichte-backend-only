const { DateTime } = require('luxon')
const MarkdownIt = require('markdown-it')
const slugify = require('slugify')
const stringHash = require('string-hash')
const project = require('./../src/_data/project.js')
var merge = require('merge')

const objectToFrontMatter = (obj, level, nested) => {
  let string = ''
  const lvl = level || 2

  let spaces = ''
  for (let i = 0; i < lvl; i++) {
    spaces += ' '
  }

  let j = 0
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object') {
      string += `\n${spaces}${isNaN(key) ? `${key}:` : '- '}`
      string += objectToFrontMatter(value, lvl + 2, !isNaN(key))
    } else {
      var lineBreak = ''

      if (nested) {
        if (j > 0) {
          lineBreak = `\n${spaces}`
        } else {
          lineBreak = `${isNaN(key) ? '' : `\n${spaces}`}`
        }
      } else {
        lineBreak = `\n${spaces}`
      }
      string += `${lineBreak}${isNaN(key) ? `${key}:` : '- '} ${value}`
    }

    j += 1
  }

  return string
}

const cacheBust = (dateObj) => {
  if (project.environment === 'development') {
    return ''
  }

  const date = DateTime.fromJSDate(dateObj)
  return stringHash(
    date.toFormat('yyyy-MM-dd') + 'T' + date.toFormat('HH:mm:ss+00:00')
  )
}

module.exports = {
  // Date formatting (machine readable)
  machineDate: (dateObj) => {
    const date = DateTime.fromJSDate(dateObj)
    return date.toFormat('yyyy-MM-dd') + 'T' + date.toFormat('HH:mm:ss+00:00')
  },
  // Date formatting (human readable)
  readableDate: (dateObj) => {
    let date = DateTime.fromJSDate(dateObj, { locale: project.site_lang })

    if (typeof dateObj === 'string') {
      date = DateTime.fromFormat(
        dateObj.split(' GMT')[0],
        'ccc LLL dd y hh:mm:ss'
      )
    }

    return date.toFormat('d. LLLL yyyy')
  },

  md: (value) => {
    const md = new MarkdownIt()
    return md.render(value)
  },

  toJSON: (obj) => {
    return JSON.stringify(obj)
  },

  toSearchEntry: (str) => {
    return str.replace(/<a class="direct-link"[^>]*>#<\/a\>/g, '')
  },

  unique: (arr) => {
    return arr.filter((obj, pos, arr) => {
      return arr.map((mapObj) => mapObj.category).indexOf(obj.category) === pos
    })
  },

  split: (arr, separator = ',') => {
    return arr.split(separator)
  },

  push: (arr, item) => {
    arr.push(item)
    return arr
  },

  cacheBust: (dateObj) => {
    if (project.environment === 'development') {
      return ''
    }

    const date = DateTime.fromJSDate(dateObj)
    return stringHash(
      date.toFormat('yyyy-MM-dd') + 'T' + date.toFormat('HH:mm:ss+00:00')
    )
  },

  sortAlpha: (collection) => {
    return collection.sort((a, b) => {
      if (a.data.title < b.data.title) {
        return -1
      }
      if (a.data.title > b.data.title) {
        return 1
      }
      return 0
    })
  },

  startsWith: (str, value) => {
    return str.indexOf(value) === 0
  },

  log: (value) => {
    console.log(value)
  },

  printObject: (obj) => {
    let string = 'settings:'
    string += objectToFrontMatter(obj)

    return string
  },

  // Split by ,
  // Unqiue
  // Sort alpha
  splitUnique: (arr) => {
    var arrSplit = []
    arr.forEach((item) => {
      item.category.split(',').forEach((splitItem) => {
        if (arrSplit.indexOf(splitItem.trim()) === -1) {
          arrSplit.push(splitItem.trim())
        }
      })
    })

    return arrSplit.sort()
  },

  addProperty: (object, key, value) => {
    const objectClone = Object.assign({ }, object)
    if (objectClone[key]) {
      objectClone[key] = `${objectClone[key]} ${value}`
    } else {
      objectClone[key] = value
    }
    return objectClone
  },

  strToSlug: (str) => {
    const options = {
      replacement: '-',
      strict: true,
      lower: true
    }
    return slugify(str, options)
  },

  cleanText: (str) => {
    return str.replace(/"/g, '').replace(/\\/g, '')
  },

  isArray: (item) => {
    return Array.isArray(item)
  },

  mergeObject: (target, source) => {
    return merge.recursive(true, target, JSON.parse(source))
  },

  iconPath: filename => {
    const path = `${project.site_asset_path}/assets/icons/${filename}`
    return path.replace('//', '/')
  },

  basePath: path => {
    const newPath = `${project.site_base_path}${path}`
    return newPath.replace('//', '/')
  },

  setAttribute: (obj, key, value) => {
    obj[key] = value;
    return obj;
  },

  ext: (path, type) => {
    let fileSuffix = `.${type}`;

    if (project.environment !== 'development') {
      fileSuffix = `.min.${type}?v=${cacheBust(project.build_time)}`
    }
    
    fileSuffix = `.min.${type}?v=${cacheBust(project.build_time)}`

    return path + fileSuffix
  }
}
