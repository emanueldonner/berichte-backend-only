var project = {
  title: SITE_TITLE,
  stage_title: STAGE_TITLE,
  stage_desc: STAGE_DESC,
  pathPrefix: SITE_PATH,
  lang: SITE_LANG,
  description: SITE_DESC,
  skipFirstChapter: SKIP_FIRST_CHAPTER,
  theme_color: SITE_COLOR,
  url: "https://www.wien.gv.at",
  build_time: new Date(),
  environment: process.env.ELEVENTY_ENV,
  version: "1.0.0",
  css_version: "1.3.1",
  asset_root: "",
  copyright: "Stadt Wien, Rathaus, A-1010 Wien",
  navbar: {
    title: "Hauptmenü",
    button_label: "Menü",
    nojslink: "/nojs.html",
    type: "microsite",
    color: SITE_COLOR,
    hide_linktext: true,
    burger: true,
    desktop: true,
    actions: [],
    search: SITE_SEARCH, // true, false, oder 'hidden'
    menu: HEADER_MENU,
  },
  indexcards: true,
  footer: {
    items: [
      {
        text: "Impressum",
        url: "https://www.wien.gv.at/info/impressum.html",
      },
      {
        text: "Datenschutz",
        url: "https://www.wien.gv.at/info/datenschutz/index.html",
      },
      {
        text: "Barrierefreiheit",
        url: "https://www.wien.gv.at/info/barrierefreiheit.html",
      },
    ],
    layout: "pipe-lg",
    attributes: {
      class: "wm-h-links--noline wm-site-footer__links",
    },
  },
  siteimprove: SITE_IMPROVE,
}

project.version_folder = project.css_version.replaceAll(".", "")

if (project.navbar.menu) {
  project.navbar.lists = [["partials/nav.njk", "include"]]
}

module.exports = project
