var debug = require('debug')('push-site')
var cd    = require('shelljs').cd
var ls    = require('shelljs').ls
var echo  = require('shelljs').echo
var exec  = require('shelljs').exec
var rm    = require('shelljs').rm

var files = ls('-A', '_site/.git')

if (!files || !files.length) {
  debug('setting up the site')
  require('./setup-site')
  debug('run the command again')
  process.exit(0)
}

debug('clearing old site files')
cd('./_site')
exec('rm -rf -- $(ls | grep -v .git)')
cd('../')

debug('building site with new files')
exec('jekyll build')

debug('committing changes to site')
var parseHead = exec('git rev-parse HEAD')
var commitHash = parseHead.output.trim()
cd('./_site')
exec('git add .')
exec(`git commit -m "Update site to ${commitHash}"`)
exec('git push')
