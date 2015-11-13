# Jekyll Mention

module Jekyll

  module MentionFilter

    def mentionify(content)
      return false if !content

      content.to_str.gsub(/(\s|\W)@([\w\-\_]+)/) do |match|
        "#{$1}<a href='http://github.com/#{$2}'>@#{$2}</a>"
      end

    end

  end

end

Liquid::Template.register_filter(Jekyll::MentionFilter)