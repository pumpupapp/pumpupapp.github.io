var debug = require('debug')('setup-site')
var cd    = require('shelljs').cd
var ls    = require('shelljs').ls
var echo  = require('shelljs').echo
var exec  = require('shelljs').exec

var pkg   = require('../package.json')

var files = ls('-A', '_site/.git')

if (files && files.length) {
  debug('the site is already set up')
  process.exit()
}

var repo = `${pkg.repository.url}`
var dest = '_site'

debug('cloning %o into %o', repo, dest)

var clone = exec(`git clone -b gh-pages ${repo} ${dest}`)

if (clone.code !== 0) {
  debug('unable to clone %o into %o', repo, dest)
  process.exit(1)
}

debug('cloned %o into %o', repo, dest)
debug('the site is now set up')