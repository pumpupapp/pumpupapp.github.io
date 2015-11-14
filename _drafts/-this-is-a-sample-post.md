---
layout: post
title: This is a Sample Post
author: amsul
---

This is some body text. The contents of this file are parsed using [Markdown](https://caleorourke.gitbooks.io/redcarpet-syntax/content/index.html). Check it out if you haven't had the chance yet: https://caleorourke.gitbooks.io/redcarpet-syntax/content/index.html.

Markdown is awesome because it allows us to easily do things like *emphasize* something, ~~cross it out~~, **make a strong statement**, or even ==highlight some words==.

Wanna link to a person/organization on Github? Sure, just `@` mention them. I'm sure @AnthonyUccello would agree that's pretty sweet.

Cool, right? :bowtie:

**Oh yeah! We've got [emoji](http://www.emoji-cheat-sheet.com/) too :heart_eyes:**

So, yeah... go crazy. :dancers: :fire: :snowman: :octocat: :boom: :dizzy:

You can also make headlines. But be careful when choosing a level. These are the advised headlines:

### This is a section headline

#### This is a subsection headline

##### This is a title for an annotation

###### This is mostly suitable for subtexts

If you use any incorrect headline, don't worry, you'll be immediately warned:

# This heading is too big

## So is this

Aaaaaaaanyhow, that's that.

---

### Be as visual as you dream!

Below is a bunch of filler text and images in various placements. Add images to bring your ideas to life! :art:

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

<img left src='/media/img.png'>

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

<img right src='/media/img.png'>

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

<img center src='/media/img.png'>

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

<img full src='/media/img-large.jpg'>

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

---

### Did I mention code blocks?

Yeah.. we got those too. *With* syntax highlighting!

```js
/**
 * Sorts and filters a list of phrases by matching the given search phrase.
 * @param  {String[]} phrases          The list of phrases to match against
 * @param  {String}   searchPhrase     The phrase to search for
 * @param  {String}   [phraseProperty] The property name of the phrase on the objects in the collection
 * @return {Array}                     The sorted and filtered list of phrases
 */
function filterAndSort(phrases, searchPhrase, phraseProperty) {
  return _.chain(phrases)
    .map(phrase => getMatches(phrase, searchPhrase, phraseProperty))
    .filter(matches => matches.words.length >= matches.searchWords.length)
    .filter(matches => matches.coefficient >= 0.025 * matches.searchWords.join('').length)
    .sortBy(matches => matches.coefficient * -1)
    .map(matches => matches.value)
    .value()
}
```

<div center>:grin:</div>
