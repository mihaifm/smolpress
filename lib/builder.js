const path = require('path');
const ejs = require('ejs');
const marked = require('marked');
const frontMatter = require('front-matter');
const glob = require('glob');
const fs = require('fs');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/advancedFormat'));
dayjs.extend(require('dayjs/plugin/customParseFormat'));
const utils = require('./utils.js');
const feed = require('./feed.js');

var pageDict = {};

marked.setOptions({ breaks: true });

var config = {
  title: "Your Smol Website",
  description: "Smol Description",
  author: "",
  theme: "tiny",
  dateFormat: "YYYY-MM-DD",
  adminTheme: "overlord",
  icon: "",
  maxComments: 50,
  maxCommentLength: 2500,
  emailNotifications: false,
  generatorVersion: ""
}

const dirs = {
  src: process.env['SMOLPRESS_SRC_PATH'] || 'source',
  out: process.env['SMOLPRESS_OUTPUT_PATH'] || 'public',
  data: process.env['SMOLPRESS_DATA_PATH'] || 'data',
  themes: process.env['SMOLPRESS_THEMES_PATH'] || 'themes',
  keep: process.env['SMOLPRESS_KEEP_LIST']
}

const loadLayout = (layout) => {
  const file = `${dirs.themes}/${config.theme}/layouts/${layout}.ejs`;
  const data = fs.readFileSync(file, 'utf-8');

  return { file, data };
}

function build() {
  createDirs();

  utils.clearFolder(dirs.out, dirs.keep ? dirs.keep.split(",") : null);

  config = Object.assign(config, JSON.parse(fs.readFileSync(`${dirs.data}/config.json`)));
  config.generatorVersion = utils.getVersion();

  if (fs.existsSync(`${dirs.themes}/${config.theme}/assets`)) {
    utils.copyFolderSync(`${dirs.themes}/${config.theme}/assets`, dirs.out);
  }

  if (fs.existsSync(`themes/${config.adminTheme}/assets`)) {
    utils.copyFolderSync(`themes/${config.adminTheme}/assets`, dirs.out);
  }

  if (fs.existsSync(`${dirs.src}/media`)) {
    utils.copyFolderSync(`${dirs.src}/media`, `${dirs.out}/media`);
  }

  if (fs.existsSync(`${dirs.src}/upload`)) {
    utils.copyFolderSync(`${dirs.src}/upload`, dirs.out);
  }

  const files = glob.sync('**/*.@(md|ejs|html)', { cwd: `${dirs.src}/pages` });

  files.forEach(file => buildPage(file));

  buildIndex();

  console.log('Site built succesfully');
}

function buildIndex() {
  const layoutName = 'index';
  const layout = loadLayout(layoutName);

  const completePage = ejs.render(
    layout.data,
    {
      filename: `${dirs.themes}/${config.theme}/layouts/${layoutName}`,
      pages: getPages(),
      config
    }
  );

  fs.writeFileSync(`${dirs.out}/index.html`, completePage);

  feed.build();
}

function buildPage(file) {
  const filePath = path.parse(file);
  let destPath = path.join(dirs.out, filePath.dir);

  if (filePath.name == 'index')
    return;

  if (filePath.name !== 'index') {
    destPath = path.join(destPath, filePath.name);
  }

  const fullFileName = `${dirs.src}/pages/${file}`;

  if (!fs.existsSync(fullFileName)) {
    console.log(`File does not exist: ${fullFileName}`);
    return;
  }

  const pageData = frontMatter(fs.readFileSync(fullFileName, 'utf-8'));
  const templateConfig = {
    page: pageData.attributes
  }

  let pageContent;

  switch (filePath.ext) {
    case '.md':
      pageContent = marked.parse(pageData.body);
      break;
    case '.ejs':
      pageContent = ejs.render(pageData.body, templateConfig);
      break;
    default:
      pageContent = pageData.body;
  }

  const layoutName = pageData.attributes.layout || 'default';
  const layout = loadLayout(layoutName);

  var commentsFile = `${dirs.data}/${filePath.name}/comments.json`;
  var comments = [];
  if (fs.existsSync(commentsFile)) {
    comments = JSON.parse(fs.readFileSync(commentsFile), 'utf8');
  }

  var pageDate = pageData.attributes.date;
  if (pageDate) {
    if (typeof pageDate.getMonth === 'function') {
      pageData.attributes.date = dayjs(pageDate).format(config.dateFormat);
    }
    else {
      pageData.attributes.date = dayjs(pageDate, config.dateFormat).format(config.dateFormat);
    }
  }

  var utctime = new Date(pageData.attributes.date).getTime();
  if (!utctime) {
    utctime = 0;
  }

  pageDict[filePath.name] = Object.assign({ utctime, url: filePath.name }, pageData.attributes);

  if (pageData.attributes.draft) {
    return pageDict[filePath.name];
  }

  const completePage = ejs.render(
    layout.data,
    Object.assign({}, templateConfig, {
      body: pageContent,
      filename: `${dirs.themes}/${config.theme}/layouts/${layoutName}`,
      config,
      comments
    })
  );

  fs.mkdirSync(destPath, { recursive: true });
  fs.writeFileSync(`${destPath}/index.html`, completePage);

  return pageDict[filePath.name];
}

function getPages() {
  let pg = [];
  for (const key in pageDict) {
    pg.push(Object.assign({ name: key }, pageDict[key]));
  }

  return pg.sort((a, b) => a.utctime == b.utctime ? 0 : b.utctime - a.utctime);
}

function createDirs() {
  if (!fs.existsSync(dirs.src))
    fs.mkdirSync(dirs.src);
  if (!fs.existsSync(dirs.data))
    fs.mkdirSync(dirs.data);

  if (!fs.existsSync(`${dirs.src}/pages`))
    fs.mkdirSync(`${dirs.src}/pages`);

  if (!fs.existsSync(`${dirs.src}/media`))
    fs.mkdirSync(`${dirs.src}/media`);

  if (!fs.existsSync(`${dirs.data}/config.json`))
    fs.writeFileSync(`${dirs.data}/config.json`, JSON.stringify(config));

  feed.init();
}

function makeApp() {
  utils.copyFolderSync(`${__dirname}/..`, ".");
  createDirs();

  console.log('Site initialized');
}

function getConfig() {
  return config;
}

function setConfig(obj) {
  let status = "Settings updated";

  config.title = obj.title;
  config.description = obj.description;
  config.author = obj.author;
  config.dateFormat = obj.dateFormat;

  if (obj.theme && fs.existsSync(`${dirs.themes}/${obj.theme}`)) {
    config.theme = obj.theme;
  }
  else {
    status = "Invalid theme";
  }

  fs.writeFileSync(`${dirs.data}/config.json`, JSON.stringify(config));

  return status;
}

module.exports = { build, buildPage, buildIndex, dirs, makeApp, getConfig, setConfig, getPages }