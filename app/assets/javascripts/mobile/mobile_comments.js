/*
 *  Copyright (c) 2010-2011, Diaspora Inc.  This file is
 *   licensed under the Affero General Public License version 3 or later.  See
 *   the COPYRIGHT file.
 */

(function() {
  Diaspora.Mobile = {};
  Diaspora.Mobile.Comments = {
    stream: function(){ return $(".stream"); },

    initialize: function() {
      var self = this;
      $(".stream").on("tap click", "a.back_to_stream_element_top", function() {
        var bottomBar = $(this).closest(".bottom_bar").first();
        var streamElement = bottomBar.parent();
        $("html, body").animate({
          scrollTop: streamElement.offset().top - 54
        }, 1000);
      });

      this.stream().on("tap click", "a.show-comments", function(evt){
        evt.preventDefault();
        self.toggleComments($(this));
      });

      this.stream().on("tap click", "a.comment-action", function(evt) {
        evt.preventDefault();
        self.showCommentBox($(this));
        var bottomBar = $(this).closest(".bottom-bar").first();
        var commentContainer = bottomBar.find(".comment-container").first();
        self.scrollToOffset(commentContainer);
      });

      this.stream().on("submit", ".new_comment", this.submitComment);
    },

    submitComment: function(evt){
      evt.preventDefault();
      var form = $(this);
      var commentBox = form.find(".comment_box");
      var commentText = $.trim(commentBox.val());
      if(!commentText){
        commentBox.focus();
        return false;
      }

      $.post(form.attr("action") + "?format=mobile", form.serialize(), function(data){
        Diaspora.Mobile.Comments.updateStream(form, data);
      }, "html").fail(function(){
        Diaspora.Mobile.Comments.resetCommentBox(this);
      });

      autosize($(".add-comment-switcher:not(.hidden) textarea"));
    },

    toggleComments: function(toggleReactionsLink) {
      if(toggleReactionsLink.hasClass("loading")) { return; }

      if (toggleReactionsLink.hasClass("active")) {
        this.hideComments(toggleReactionsLink);
      } else {
        this.showComments(toggleReactionsLink);
      }
    },

    hideComments: function(toggleReactionsLink) {
      var bottomBar = toggleReactionsLink.closest(".bottom-bar").first();
      this.bottomBarLazy(bottomBar).deactivate();
      toggleReactionsLink.removeClass("active");
    },

    showComments: function(toggleReactionsLink) {
      var bottomBar = toggleReactionsLink.closest(".bottom-bar").first(),
          bottomBarContainer = this.bottomBarLazy(bottomBar),
          existingCommentsContainer = bottomBarContainer.getCommentsContainer(),
          commentActionLink = bottomBar.find("a.comment-action");

      bottomBarContainer.activate();
      bottomBarContainer.showLoader();

      if (existingCommentsContainer.length > 0) {
        this.showLoadedComments(toggleReactionsLink, existingCommentsContainer, commentActionLink);
        bottomBarContainer.hideLoader();
      } else {
        this.showUnloadedComments(toggleReactionsLink, bottomBar, commentActionLink);
      }
    },

    showLoadedComments: function(toggleReactionsLink, existingCommentsContainer, commentActionLink) {
      this.showCommentBox(commentActionLink);
      existingCommentsContainer.find("time.timeago").timeago();
    },

    showUnloadedComments: function(toggleReactionsLink, bottomBar, commentActionLink) {
      toggleReactionsLink.addClass("loading");
      var bottomBarContainer = this.bottomBarLazy(bottomBar);
      var self = this;
      $.ajax({
        url: toggleReactionsLink.attr("href"),
        success: function (data) {
          toggleReactionsLink.addClass("active").removeClass("loading");
          $(data).insertAfter(bottomBar.children(".show-comments").first());
          self.showCommentBox(commentActionLink);
          bottomBarContainer.getCommentsContainer().find("time.timeago").timeago();
          bottomBarContainer.activate();
        },
        error: function(){
          bottomBarContainer.deactivate();
        }
      }).always(function(){
        toggleReactionsLink.removeClass("loading");
        bottomBarContainer.hideLoader();
      });
    },

    bottomBarLazy: function(bottomBar) {
      return  {
        loader: function(){
          return bottomBar.find(".ajax-loader");
        },

        getCommentsContainer: function(){
          return bottomBar.find(".comment-container").first();
        },

        getShowCommentsLink: function(){
          return bottomBar.find("a.show-comments");
        },

        showLoader: function(){
          this.loader().removeClass("hidden");
        },

        hideLoader: function(){
          this.loader().addClass("hidden");
        },

        activate: function(){
          bottomBar.addClass("active").removeClass("inactive");
          this.getShowCommentsLink().addClass("active");
          this.getShowCommentsLink().find("i").removeClass("entypo-chevron-down").addClass("entypo-chevron-up");
        },

        deactivate: function(){
          bottomBar.removeClass("active").addClass("inactive");
          this.getShowCommentsLink().removeClass("active");
          this.getShowCommentsLink().find("i").addClass("entypo-chevron-down").removeClass("entypo-chevron-up");
        }
      };
    },

    scrollToOffset: function(commentsContainer){
      var commentCount = commentsContainer.find("li.comment").length;
      if ( commentCount > 3 ) {
        var lastComment = commentsContainer.find("li:nth-child("+(commentCount-3)+")");
        $("html,body").animate({
          scrollTop: lastComment.offset().top
        }, 1000);
      }
    },

    showCommentBox: function(link){
      var bottomBar = link.closest(".bottom-bar").first();
      var textArea = bottomBar.find("textarea.comment_box").first()[0];
      bottomBar.find(".add-comment-switcher").removeClass("hidden");
      autosize(textArea);
    },

    updateStream: function(form, data) {
      var bottomBar = form.closest(".bottom-bar").first();
      this.addNewComments(bottomBar, data);
      this.updateCommentCount(bottomBar);
      this.updateReactionCount(bottomBar);
      this.handleCommentShowing(form, bottomBar);
      bottomBar.find("time.timeago").timeago();
    },

    addNewComments: function(bottomBar, data) {
      if ($(".comment-container", bottomBar).length === 0) {
        $(".show-comments", bottomBar).after($("<div/>", {"class": "comment-container"}));
        $(".comment-container", bottomBar).append($("<ul/>", {"class": "comments"}));
      }
      $(".comment-container .comments", bottomBar).append(data);
    },

    // Fix for no comments
    updateCommentCount: function(bottomBar) {
      var commentCount = bottomBar.find(".comment-count");
      commentCount.text(commentCount.text().replace(/(\d+)/, function (match) {
        return parseInt(match, 10) + 1;
      }));
    },

    // Fix for no reactions
    updateReactionCount: function(bottomBar) {
      var toggleReactionsLink = bottomBar.find(".show-comments").first();
      toggleReactionsLink.text(toggleReactionsLink.text().replace(/(\d+)/, function (match) {
        return parseInt(match, 10) + 1;
      }));
    },

    handleCommentShowing: function(form, bottomBar) {
      var formContainer = form.parent();
      formContainer.find("textarea.form-control").first().val("");
      this.resetCommentBox(formContainer);
      var commentActionLink = bottomBar.find("a.comment-action").first();
      commentActionLink.addClass("inactive");
      var toggleReactionsLink = bottomBar.find(".show-comments").first();
      this.showComments(toggleReactionsLink);
    },

    resetCommentBox: function(el){
      var commentButton = el.find("input.comment-button").first();
      commentButton.attr("value", commentButton.data("reset-with"));
      commentButton.removeAttr("disabled");
      commentButton.blur();
    }
  };
})();

$(document).ready(function() {
  Diaspora.Mobile.Comments.initialize();
});
