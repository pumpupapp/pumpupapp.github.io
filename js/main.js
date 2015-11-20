function createAnchor(id) {
  var anchor = document.createElement('a')
  anchor.className = 'content__permalink'
  anchor.href = '#' + id
  anchor.innerHTML = '<span>§</span>'
  return anchor
}



function linkAnchors(level, container) {
  var headers = container.querySelectorAll('h' + level)
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i]
    if (header.id) {
      header.appendChild(createAnchor(header.id))
    }
  }
}



function letsDoThis() {
  var container = document.querySelector('.content--post')
  if (!container) {
    return
  }
  for (var level = 1; level <= 6; level++) {
    linkAnchors(level, container)
  }
}



letsDoThis()