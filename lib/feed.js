const fs = require('fs');
const { Feed } = require('feed');

var feed = {};

var defaultFeed = {
  title: "Your Smol Feed Title",
  description: "Your Smol Feed Description",
  id: "http://localhost:3939/",
  link: "http://localhost:3939/",
  copyright: "",
  generator: "smolpress",
  author: {
    name: "",
    email: "",
    link: ""
  }
}

function init() {
  var builder = require('./builder');
  if (!fs.existsSync(`${builder.dirs.data}/feedconfig.json`))
    fs.writeFileSync(`${builder.dirs.data}/feedconfig.json`, JSON.stringify(defaultFeed));
}

function build() {
  var builder = require('./builder');
  var feedConfigFile = `${builder.dirs.data}/feedconfig.json`;
  if (!fs.existsSync(feedConfigFile))
    return;

  var feedconfig = JSON.parse(fs.readFileSync(feedConfigFile));

  feed = new Feed(feedconfig);

  builder.getPages().forEach(page => {
    feed.addItem({
      title: page.title,
      id: page.url,
      link: feedconfig.link + page.url,
      description: page.description,
      date: new Date(page.date)
    })
  })

  fs.writeFileSync(`${builder.dirs.out}/rss.xml`, feed.rss2());
}

function get() {
  return feed;
}

module.exports = {init, build, get}