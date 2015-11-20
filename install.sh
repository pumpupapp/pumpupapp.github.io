#!/bin/bash

# install xcode-select
xcode-select --install
echo "NOTE: If xcode select needs to be downloaded, rerun this script once complete"

# install ruby
command ruby -v >/dev/null 2>&1 && echo "Ruby installed" || {
  echo "Ruby not found... installing now"
  curl -#L https://get.rvm.io | bash -s stable --autolibs=enabled --ruby
}
ruby -v

# install jekyll
command jekyll -v >/dev/null 2>&1 && echo "Jekyll installed" || {
  echo "Jekyll not found... installing now"
  sudo gem install jekyll
}
jekyll -v

# install jekyll plugins
echo "Installing Jekyll plugins"
sudo gem install gemoji jekyll-paginate redcarpet

# install node
command node -v >/dev/null 2>&1 && echo "Node installed" || {
  echo "Node not found... installing now"
  brew install node
  npm install -g n
}
node -v

# install node dependencies
echo "Installing Node packages"
npm install
