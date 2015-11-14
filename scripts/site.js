var debug    = require('debug')('site')
var program  = require('commander')

var siteUtil = require('./utils/site')

program
  .option('-C, --clone', 'Clone the site (only needed once)')
  .option('-c, --clean', 'Clean the site build folder')
  .option('-p, --push', 'Build and push the site changes')
  .parse(process.argv)

if (program.clone) {
  debug('starting to clone the site')
  siteUtil.clone()
  return
}

if (program.clean) {
  debug('starting to clean the site')
  siteUtil.clean()
  return
}

if (program.push) {
  debug('starting to push the site')
  siteUtil.push()
  return
}

debug('run the site script with a flag')
debug('check `npm run site -- --help` for more details')
