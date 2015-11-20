var debug   = require('debug')('utils:site')
var cd      = require('shelljs').cd
var ls      = require('shelljs').ls
var exec    = require('shelljs').exec

var gitUtil = require('./git')
var pkg     = require('../../package.json')



/**
 * Clones the remote site into the local site directory.
 */
function clone() {

  debug('setting up site')

  var files = ls('-A', '_site/.git')

  if (files && files.length) {
    debug('the site is already set up')
    process.exit()
  }

  var repo = `${pkg.repository.url}`
  var dest = '_site'

  debug('cloning %o into %o', repo, dest)

  var clone = exec(`git clone -b master ${repo} ${dest}`)

  if (clone.code !== 0) {
    debug('unable to clone %o into %o', repo, dest)
    process.exit(1)
  }

  debug('cloned %o into %o', repo, dest)
  debug('the site is now set up')

}



/**
 * Pushes the site from the local site directory.
 */
function push() {

  debug('pushing site')

  var files = ls('-A', '_site/.git')

  if (!files || !files.length) {
    debug('setting up the site')
    clone()
    debug('run the command again')
    process.exit(0)
  }

  if (gitUtil.isDirtyWorkingCopy()) {
    throw new Error('Cannot push the site with a dirty working copy')
  }

  clean()

  debug('building site with new files')
  exec('jekyll build')

  debug('committing changes to site')
  var parseHead = exec('git rev-parse HEAD')
  var commitHash = parseHead.output.trim()
  cd('./_site')
  exec('git add .')
  exec(`git commit -m "Update site to ${commitHash}"`)
  exec('git push')

  debug('pushed site')

}



/**
 * Cleans the site files.
 */
function clean() {

  debug('cleaning site files')

  cd('./_site')
  exec('rm -rf -- $(ls | grep -v .git)')
  cd('../')

  debug('cleaned site files')

}



module.exports = {
  clone,
  push,
  clean,
}
