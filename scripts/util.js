var debug = require('debug')('util')
var exec  = require('shelljs').exec



/**
 * Checks if the current directory is a git directory with a dirty working copy.
 * @return {Boolean}
 */
function isDirtyWorkingCopy() {

  debug('checking if working copy is dirty')

  var result

  // Check if there are unstaged files
  result = exec('git diff --exit-code', { silent: true })
  if (result && result.output) {
    debug('working copy has unstaged files')
    return true
  }

  // Check if there are staged files
  result = exec('git diff --cached --exit-code', { silent: true })
  if (result && result.output) {
    debug('working copy has staged files')
    return true
  }

  // Check if there are untracked files
  result = exec('git ls-files --other --exclude-standard --directory', { silent: true })
  if (result && result.output) {
    debug('working copy has untracked files')
    return true
  }

  return false

}



module.exports = {
  isDirtyWorkingCopy
}
