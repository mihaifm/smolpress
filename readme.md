# smolpress

Smolpress is a small website builder. It aims to be an alternative to the increasingly complex static site generators and content managers available today.

With smolpress you would just write your posts in markdown using the built-in online editor. The markdown content is saved on the disk and converted to html on the spot.
No database is required, everything is file based.    

It can be used for personal websites, blogs, quick prototypes or as a baseline for more complex sites.

A node.js server is used to provide some dynamic content like comments, image upload and markdown editing.

## Features

* All content statically generated
* Admin panel with authentication
* Online markdown editor
* Image upload with resizing and optimization
* Support for ejs templates
* Page metadata (front-matter)
* Drafts
* Default theme
* Simple comments system with email notifications
* RSS feed
* No database, everthing is file based

## FAQ

### How does it compare to a static site generator (SSG) ?

Smolpress is also a static site generator and supports ejs templates in addition to markdown files. To statically generate the site simply start the server.
While smolpress runs on a node.js server to provide some dynamic features, your posts are statically generated at all time so you can move them to a different web server if you feel the need.

Compared to an SSG, smolpress provides an online markdown editor so you can edit your posts using your own website rather than using an external editor and fiddling with live-reload or deploy scripts.

### How does it compare to a content management system (CMS) ?

Smolpress is very similar to a CMS, in the sense that you can manage your content from an online interface. However it is smaller, much smaller than a real CMS like Wordpress.

With smolpress all posts sit nicely on the disk written in Markdown and are not deeply burried inside a database. In fact smolpress does not even require a database.

## Getting started

    npm install -g smolpress
    cd blog
    smolpress init
    export SMOLPRESS_VAULT_PASSWORD=yourpassword
    smolpress start

If you're running Windows replace the `export` command above with `set`.

Alternate installation (that doesn't involve the global `smolpress` command):

    git clone https://github.com/mihaifm/smolpress blog
    cd blog
    npm install
    export SMOLPRESS_VAULT_PASSWORD=yourpassword
    node index.js

Now simply visit `localhost:3939` to view your blog and `localhost:3939/admin` to create a new post.

## Usage

###  Authentication

Smolpress provides a single user that is created when visiting `/admin`. User data is stored in a text file (`data/vault.txt`) which is encrypted with the password available in the SMOLPRESS_VAULT_PASSWORD environment variable. User password is also hashed with sha512.

### Markdown editing

You can edit any post by visiting the `/admin` panel and clicking the `Edit` link for any post. Click `Preview` to see the markdown output and `Save` to have the post converted to html.

### Images

Images can be uploaded via the `/media` link in the admin panel or by drag and drop in the editor. New images are stored in `source/media` and copied to `public/media` when the site in generated.

### Page front matter

Smolpress uses [front-matter](https://jekyllrb.com/docs/front-matter/) to add metadata to your pages. Any property name is supported and can be later used in the theme for customization.
The `layout`, `title` and `date` properties are supported by the default theme.
Date format needs to be specified in the `/settings` panel. [Simple](https://day.js.org/docs/en/parse/string-format) and [advanced](https://day.js.org/docs/en/plugin/advanced-format) formats are provided by [dayjs](https://day.js.org/en/).

### Comments

The comments system is simple and smol. Comments are saved as json files and converted to html when the site is generated. 
There is no anti-spam protection but the number of comments per post and comment length are limited by config options. It should also be fairly straightforward to install something like [Akismet](https://www.npmjs.com/package/akismet-api) to prevent spam.

### Themes

Themes are based on [ejs](https://ejs.co/) templates and are placed in the `themes` folder. Smolpress has a default theme called `tiny`. Changing the theme can be done in the `/settings` panel.     
It is recommended to make a copy of the default theme and naming it to something else before making any customizations to the site. This way you won't lose any changes when updating smolpress.

### RSS

RSS feed is generated automatically for the entire site. RSS fields can be configured by editing `data/feedconfig.json`. This file is generated with some placeholder values when the server is first started.

## Config

#### Environment variables

* __SMOLPRESS_VAULT_PASSWORD__ -  encryption password for the "vault" containing user data.
* __SMOLPRESS_PORT__ - server port. Default: `3939`
* __SMOLPRESS_SRC_PATH__ - path to the markdown page sources. Default: `source`
* __SMOLPRESS_OUTPUT_PATH__ - path to the generated static files. Default: `public`
* __SMOLPRESS_DATA_PATH__ - path to the data folder. Default: `data`
* __SMOLPRESS_THEMES_PATH__ - path to the themes folder. Default: `themes`
* __SMOLPRESS_KEEP_LIST__ - comma separated list of files/folders to be kept when cleaning the output folder

#### Site options

A smol number of options like site title and description are available in the `config.json` file (stored in the `data` folder). 
You can edit the file manually or use the `/settings` panel of your website.

## Showcase

[https://mihai.fm](https://mihai.fm)