/* global Utils, Options, myjQuery */

myjQuery(document).ready(function () {
    BarElements.init();

    Utils.myRuntimeSendMessage({
        action: 'background_content_bar_init',
        slug: window.location.hash.substr(1) || ''
    }, function (response) {
        if (!Utils.varIsUndefined(response)) {
            Utils.myConsoleLog('info', "'background_content_bar_init' response", response);

            Bar.initData(response.data);
            Bar.initBar(function () {
                window.setTimeout(function () {
                    Utils.postMessageToTopWindow({
                        action: 'content_bar_init',
                        bar_minimized: Bar.bar_minimized,
                        bar_maximized_direction: Bar.data.bar_maximized_direction,
                        height: BarElements.getBarHeight(),
                        width: BarElements.getBarWidth()
                    });
                }, 50);

                var update_last_updated_interval = window.setInterval(function () {
                    // try because the Bar object might be dead
                    try {
                        Utils.myConsoleLog('info', `Updating last_updated for slug '${Bar.data.slug}'`);

                        Bar.actionPostMessage('content_bar_last_updated');
                    } catch (e) {
                        Utils.myConsoleLog('error', `Object might be dead, error: '${e.message}'`);

                        // clear the inverval if so
                        window.clearInterval(update_last_updated_interval);
                    }
                }, Bar.update_last_updated_delay);
            });
        }
    });
});

var Bar = {
    update_last_updated_delay: Utils.minutesToMs(25),
    initData: function (data) {
        Bar.data = data;
        Bar.logged_in = data.is_logged_in;
        Bar.reddit_url = data.reddit_url;
    },
    initEvents: function () {
        BarElements.content_bar.$upvote.on('click', function () {
            Bar.actionUpvote();
        });
        BarElements.content_bar.$downvote.on('click', function () {
            Bar.actionDownvote();
        });
        BarElements.content_bar.$save.on('click', function () {
            Bar.actionSave();
        });
        BarElements.content_bar.$close.on('click', function () {
            Bar.actionClose();
        });

        BarElements.content_bar.$spam.on('click', function () {
            Bar.actionSpam();
        });
        BarElements.content_bar.$remove.on('click', function () {
            Bar.actionRemove();
        });
        BarElements.content_bar.$approve.on('click', function () {
            Bar.actionApprove();
        });

        BarElements.content_bar.$minimize.on('click', function () {
            Bar.actionMinimize();
        });
        BarElements.maximize_bar.$maximize.on('click', function () {
            Bar.actionMaximize();
        });
        BarElements.maximize_bar.$maximize.on('contextmenu', function (event) {
            event.preventDefault();

            Bar.actionMaximizeDirection();
        });
        BarElements.maximize_bar.$upvote.on('click', function () {
            Bar.actionUpvote();
        });
        BarElements.maximize_bar.$downvote.on('click', function () {
            Bar.actionDownvote();
        });
        BarElements.maximize_bar.$save.on('click', function () {
            Bar.actionSave();
        });

        if (!Bar.bar_minimized) {
            myjQuery(window).on('resize', function () {
                Utils.postMessageToTopWindow({
                    action: 'content_bar_resize',
                    height: BarElements.getBarHeight()
                });
            });
        }
    },
    initBar: function (callback) {
        Options.getOptions(function (options) {
            Bar.options = options;
            Bar.bar_minimized = !Utils.varIsUndefined(Bar.data.bar_minimized) ? Bar.data.bar_minimized : Bar.options.start_minimized;

            Bar.setBarData();

            if (Utils.varIsFunction(callback)) {
                callback();
            }
        });
    },
    setBarData: function () {
        var permalink = Bar.data.permalink;

        BarElements.toggleBodyClasses();
        BarElements.toggleBarClasses();

        BarElements.setLogoData();
        BarElements.setLogoLabelData();
        BarElements.setScoreData(Bar.data.score, Bar.data.likes, Bar.data.dislikes);
        BarElements.setTitleData(Bar.data.title, `${Bar.reddit_url}${permalink}`);
        BarElements.setSubredditData(Bar.data.subreddit);
        BarElements.setLoginData();
        BarElements.setUpvoteData(Bar.data.likes);
        BarElements.setDownvoteData(Bar.data.dislikes);
        BarElements.setCommentsData(Bar.data.num_comments, `${Bar.reddit_url}${permalink}`);
        BarElements.setSaveData(Bar.data.saved);

        BarElements.setSpamData();
        BarElements.setRemoveData();
        BarElements.setApproveData();

        BarElements.setCloseData();
        BarElements.setMinimizeData();
        BarElements.setMaximizeData();

        BarElements.fixMaximizeBarTheme();
        BarElements.setLinksParent();

        Bar.initEvents();
    },
    actionUpvote: function (post_message = true) {
        if (!Bar.data.likes) {
            Bar.data.score++;
        } else {
            Bar.data.score--;
        }
        Bar.data.likes = !Bar.data.likes;

        if (post_message) {
            if (Bar.data.dislikes) {
                Bar.actionDownvote(false);
            }

            Bar.actionPostMessage('content_bar_like');
        }

        Bar.setBarData();
    },
    actionDownvote: function (post_message = true) {
        if (!Bar.data.dislikes) {
            Bar.data.score--;
        } else {
            Bar.data.score++;
        }
        Bar.data.dislikes = !Bar.data.dislikes;

        if (post_message) {
            if (Bar.data.likes) {
                Bar.actionUpvote(false);
            }

            Bar.actionPostMessage('content_bar_dislike');
        }

        Bar.setBarData();
    },
    actionSave: function () {
        var action;
        if (!Bar.data.saved) {
            action = 'content_bar_save';
        } else {
            action = 'content_bar_unsave';
        }

        Bar.data.saved = !Bar.data.saved;

        Bar.actionPostMessage(action);
        Bar.setBarData();
    },
    actionClose: function () {
        Bar.actionPostMessage('content_bar_close');

        Utils.postMessageToTopWindow({
            action: 'content_bar_close'
        });
    },
    actionSpam: function () {
        Bar.data.is_spammed = !Bar.data.is_spammed;
        Bar.data.to_approve = null;

        Bar.actionPostMessage('content_bar_spam');
        Bar.setBarData();
    },
    actionRemove: function () {
        Bar.data.is_spammed = !Bar.data.is_spammed;
        Bar.data.to_approve = null;

        Bar.actionPostMessage('content_bar_remove');
        Bar.setBarData();
    },
    actionApprove: function () {
        if (Bar.data.to_approve === null) {
            Bar.data.is_spammed = !Bar.data.is_spammed;
        }
        Bar.data.to_approve = null;

        Bar.actionPostMessage('content_bar_approve');
        Bar.setBarData();
    },
    actionMinimize: function () {
        Bar.actionPostMessage('content_bar_minimize');

        Utils.postMessageToTopWindow({
            action: 'content_bar_reinit'
        });
    },
    actionMaximize: function () {
        Bar.actionPostMessage('content_bar_maximize');

        Utils.postMessageToTopWindow({
            action: 'content_bar_reinit'
        });
    },
    actionMaximizeDirection: function () {
        Bar.actionPostMessage('content_bar_maximized_direction');

        Utils.postMessageToTopWindow({
            action: 'content_bar_reinit'
        });
    },
    actionPostMessage: function (action) {
        Utils.myRuntimeSendMessage({
            action: 'background_content_bar_action',
            subaction: action,
            data: Bar.data
        });
    },
    positionIsLeft: function () {
        return Utils.checkPositionIsLeft(Bar.options.maximize_location_left, Bar.data.bar_maximized_direction);
    }
};

var BarElements = {
    init: function () {
        BarElements.$body = myjQuery('body');
        BarElements.$content_bar = BarElements.$body.find('#content_bar');
        BarElements.$maximize_bar = BarElements.$body.find('#maximize_bar');

        BarElements.content_bar = {};
        BarElements.maximize_bar = {};

        BarElements.content_logo = '.content_logo';
        BarElements.content_logo_label = '.content_logo_label';
        BarElements.content_score = '.content_score';
        BarElements.content_title = '.content_title';
        BarElements.content_subreddit = '.content_subreddit';
        BarElements.content_login = '.content_login';
        BarElements.content_upvote = '.content_upvote';
        BarElements.content_downvote = '.content_downvote';
        BarElements.content_save = '.content_save';
        BarElements.content_comments = '.content_comments';
        BarElements.content_spam = '.content_spam';
        BarElements.content_remove = '.content_remove';
        BarElements.content_approve = '.content_approve';
        BarElements.content_close = '.content_close';
        BarElements.content_minimize = '.content_minimize';
        BarElements.content_maximize = '.content_maximize';

        BarElements.content_bar.$logo = BarElements.$content_bar.find(BarElements.content_logo);
        BarElements.content_bar.$logo_label = BarElements.$content_bar.find(BarElements.content_logo_label);
        BarElements.content_bar.$score = BarElements.$content_bar.find(BarElements.content_score);
        BarElements.content_bar.$title = BarElements.$content_bar.find(BarElements.content_title);
        BarElements.content_bar.$subreddit = BarElements.$content_bar.find(BarElements.content_subreddit);
        BarElements.content_bar.$login = BarElements.$content_bar.find(BarElements.content_login);
        BarElements.content_bar.$upvote = BarElements.$content_bar.find(BarElements.content_upvote);
        BarElements.content_bar.$downvote = BarElements.$content_bar.find(BarElements.content_downvote);
        BarElements.content_bar.$save = BarElements.$content_bar.find(BarElements.content_save);
        BarElements.content_bar.$comments = BarElements.$content_bar.find(BarElements.content_comments);
        BarElements.content_bar.$spam = BarElements.$content_bar.find(BarElements.content_spam);
        BarElements.content_bar.$remove = BarElements.$content_bar.find(BarElements.content_remove);
        BarElements.content_bar.$approve = BarElements.$content_bar.find(BarElements.content_approve);
        BarElements.content_bar.$close = BarElements.$content_bar.find(BarElements.content_close);
        BarElements.content_bar.$minimize = BarElements.$content_bar.find(BarElements.content_minimize);

        BarElements.maximize_bar.$maximize = BarElements.$maximize_bar.find(BarElements.content_maximize);
        BarElements.maximize_bar.$login = BarElements.$maximize_bar.find(BarElements.content_login);
        BarElements.maximize_bar.$upvote = BarElements.$maximize_bar.find(BarElements.content_upvote);
        BarElements.maximize_bar.$downvote = BarElements.$maximize_bar.find(BarElements.content_downvote);
        BarElements.maximize_bar.$save = BarElements.$maximize_bar.find(BarElements.content_save);
        BarElements.maximize_bar.$comments = BarElements.$maximize_bar.find(BarElements.content_comments);
    },
    getBarHeight: function () {
        return BarElements[!Bar.bar_minimized ? '$content_bar' : '$maximize_bar'].height();
    },
    getBarWidth: function () {
        var width = !Bar.bar_minimized ? '' : 0;

        if (Bar.bar_minimized) {
            width += BarElements.maximize_bar.$maximize.closest('div').outerWidth(true);
            width += BarElements.maximize_bar.$comments.closest('div').outerWidth(true);
            if (Bar.options.show_maximize_action_icons) {
                if (!Bar.logged_in) {
                    width += BarElements.maximize_bar.$login.closest('div').outerWidth(true);
                } else {
                    width += BarElements.maximize_bar.$upvote.closest('div').outerWidth(true);
                    width += BarElements.maximize_bar.$downvote.closest('div').outerWidth(true);
                    width += BarElements.maximize_bar.$save.closest('div').outerWidth(true);
                }
            }
            width += 1;
        }

        return width;
    },
    toggleBodyClasses: function () {
        BarElements.$body.toggleClass('light_theme', !Bar.options.dark_theme);
        BarElements.$body.toggleClass('dark_theme', Bar.options.dark_theme);
        BarElements.$body.toggleClass('transparent_background', Bar.options.transparent_background || Bar.bar_minimized);
        BarElements.$body.toggleClass('box_shadow_bottom', !Bar.options.disable_shadow && !Bar.options.bar_location_bottom);
        BarElements.$body.toggleClass('box_shadow_top', !Bar.options.disable_shadow && Bar.options.bar_location_bottom);
        BarElements.$body.toggleClass('box_shadow_initial', Bar.options.disable_shadow || Bar.bar_minimized);
    },
    showContentBar: function () {
        BarElements.$content_bar.removeClass('display_none');
        BarElements.$maximize_bar.addClass('display_none');
    },
    showMaximizeBar: function () {
        BarElements.$content_bar.addClass('display_none');
        BarElements.$maximize_bar.removeClass('display_none');
    },
    toggleBarClasses: function () {
        BarElements.$content_bar.toggleClass('container', !Bar.options.fluid_container);
        BarElements.$content_bar.toggleClass('container-fluid', Bar.options.fluid_container);
        BarElements.$content_bar.find('.row').toggleClass('big_buttons', Bar.options.big_buttons);

        if (!Bar.bar_minimized) {
            BarElements.showContentBar();
        } else {
            BarElements.showMaximizeBar();
        }
    },
    setLogoData: function () {
        BarElements.content_bar.$logo.prop('title', 'Return to reddit');
        BarElements.content_bar.$logo.prop('href', Bar.reddit_url);
    },
    setLogoLabelData: function () {
        BarElements.content_bar.$logo_label.closest('div').toggleClass('display_none', Bar.options.hide_reddit);

        BarElements.content_bar.$logo_label.text('reddit');
        BarElements.content_bar.$logo_label.prop('title', 'Return to reddit');
        BarElements.content_bar.$logo_label.prop('href', Bar.reddit_url);
    },
    setScoreData: function (score, likes, dislikes) {
        BarElements.content_bar.$score.closest('div').toggleClass('display_none', Bar.options.hide_score);

        BarElements.content_bar.$score.text(score);
        BarElements.content_bar.$score.toggleClass('btn-outline-secondary', !likes && !dislikes);
        BarElements.content_bar.$score.toggleClass('btn-outline-warning', likes || false);
        BarElements.content_bar.$score.toggleClass('btn-outline-primary', dislikes || false);
        BarElements.content_bar.$score.toggleClass('btn-sm', !Bar.options.big_buttons);
    },
    setTitleData: function (title, href) {
        BarElements.content_bar.$title.text(title);
        BarElements.content_bar.$title.prop('title', title);
        BarElements.content_bar.$title.prop('href', href);

        BarElements.maximize_bar.$comments.prop('title', title);
    },
    setSubredditData: function (subreddit) {
        BarElements.content_bar.$subreddit.closest('div').toggleClass('display_none', Bar.options.hide_subreddit);

        BarElements.content_bar.$subreddit.text(subreddit);
        BarElements.content_bar.$subreddit.prop('href', `${Bar.reddit_url}/${subreddit}`);
        BarElements.content_bar.$subreddit.toggleClass('btn-sm', !Bar.options.big_buttons);
    },
    setLoginData: function () {
        BarElements.content_bar.$login.closest('div').toggleClass('display_none', Bar.logged_in);
        BarElements.content_bar.$login.find('span').toggleClass('display_none', Bar.options.hide_labels);

        BarElements.content_bar.$login.prop('href', `${Bar.reddit_url}/login`);
        BarElements.content_bar.$login.toggleClass('btn-sm', !Bar.options.big_buttons);

        BarElements.maximize_bar.$login.closest('div').toggleClass('display_none', Bar.logged_in || !Bar.options.show_maximize_action_icons);
        BarElements.maximize_bar.$login.prop('href', `${Bar.reddit_url}/login`);
        BarElements.maximize_bar.$login.toggleClass('btn-sm', !Bar.options.big_buttons);
    },
    setUpvoteData: function (likes) {
        BarElements.content_bar.$upvote.closest('div').toggleClass('display_none', !Bar.logged_in);
        BarElements.content_bar.$upvote.find('span').toggleClass('display_none', Bar.options.hide_labels);

        BarElements.content_bar.$upvote.toggleClass('active', likes || false);
        BarElements.content_bar.$upvote.toggleClass('btn-sm', !Bar.options.big_buttons);

        BarElements.maximize_bar.$upvote.closest('div').toggleClass('display_none', !Bar.logged_in || !Bar.options.show_maximize_action_icons);
        BarElements.maximize_bar.$upvote.toggleClass('btn-outline-warning active', likes || false);
        BarElements.maximize_bar.$upvote.toggleClass('btn-outline-secondary', !(likes || false));
        BarElements.maximize_bar.$upvote.toggleClass('btn-sm', !Bar.options.big_buttons);
    },
    setDownvoteData: function (dislikes) {
        BarElements.content_bar.$downvote.closest('div').toggleClass('display_none', !Bar.logged_in);
        BarElements.content_bar.$downvote.find('span').toggleClass('display_none', Bar.options.hide_labels);

        BarElements.content_bar.$downvote.toggleClass('active', dislikes || false);
        BarElements.content_bar.$downvote.toggleClass('btn-sm', !Bar.options.big_buttons);

        BarElements.maximize_bar.$downvote.closest('div').toggleClass('display_none', !Bar.logged_in || !Bar.options.show_maximize_action_icons);
        BarElements.maximize_bar.$downvote.toggleClass('btn-outline-primary active', dislikes || false);
        BarElements.maximize_bar.$downvote.toggleClass('btn-outline-secondary', !(dislikes || false));
        BarElements.maximize_bar.$downvote.toggleClass('btn-sm', !Bar.options.big_buttons);
    },
    setSaveData: function (saved) {
        BarElements.content_bar.$save.closest('div').toggleClass('display_none', Bar.options.hide_save || !Bar.logged_in);
        BarElements.content_bar.$save.find('span').toggleClass('display_none', Bar.options.hide_labels);

        BarElements.content_bar.$save.toggleClass('active', saved);
        BarElements.content_bar.$save.toggleClass('btn-sm', !Bar.options.big_buttons);

        BarElements.maximize_bar.$save.closest('div').toggleClass('display_none', Bar.options.hide_save || !Bar.logged_in || !Bar.options.show_maximize_action_icons);
        BarElements.maximize_bar.$save.toggleClass('active', saved);
        BarElements.maximize_bar.$save.toggleClass('btn-sm', !Bar.options.big_buttons);
    },
    setCommentsData: function (num_comments, href) {
        BarElements.content_bar.$comments.closest('div').toggleClass('display_none', Bar.options.hide_comments);

        BarElements.content_bar.$comments.find('span').text(num_comments);
        BarElements.content_bar.$comments.prop('href', href);
        BarElements.content_bar.$comments.toggleClass('btn-sm', !Bar.options.big_buttons);

        BarElements.maximize_bar.$comments.find('span').text(num_comments);
        BarElements.maximize_bar.$comments.prop('href', href);
        BarElements.maximize_bar.$comments.toggleClass('btn-sm', !Bar.options.big_buttons);
    },
    setSpamData: function () {
        BarElements.content_bar.$spam.closest('div').toggleClass('display_none', !Bar.logged_in || !Bar.data.is_mod || Bar.data.is_spammed || Bar.options.hide_mod_icons);
        BarElements.content_bar.$spam.find('span').toggleClass('display_none', Bar.options.hide_labels);

        BarElements.content_bar.$spam.toggleClass('btn-sm', !Bar.options.big_buttons);
    },
    setRemoveData: function () {
        BarElements.content_bar.$remove.closest('div').toggleClass('display_none', !Bar.logged_in || !Bar.data.is_mod || Bar.data.is_spammed || Bar.options.hide_mod_icons);
        BarElements.content_bar.$remove.find('span').toggleClass('display_none', Bar.options.hide_labels);

        BarElements.content_bar.$remove.toggleClass('btn-sm', !Bar.options.big_buttons);
    },
    setApproveData: function () {
        BarElements.content_bar.$approve.closest('div').toggleClass('display_none', !Bar.logged_in || !Bar.data.is_mod || (!Bar.data.is_spammed && Bar.data.to_approve === null) || Bar.options.hide_mod_icons);
        BarElements.content_bar.$approve.find('span').toggleClass('display_none', Bar.options.hide_labels);

        BarElements.content_bar.$approve.toggleClass('btn-sm', !Bar.options.big_buttons);
    },
    setCloseData: function () {
        BarElements.content_bar.$close.toggleClass('btn-sm', !Bar.options.big_buttons);
    },
    setMinimizeData: function () {
        BarElements.content_bar.$minimize.toggleClass('btn-sm', !Bar.options.big_buttons);

        if (Bar.options.bar_location_bottom) {
            BarElements.content_bar.$minimize.html(BarElements.content_bar.$minimize.data('minimize_down'));
        } else {
            BarElements.content_bar.$minimize.html(BarElements.content_bar.$minimize.data('minimize_up'));
        }
    },
    setMaximizeData: function () {
        BarElements.maximize_bar.$maximize.toggleClass('btn-sm', !Bar.options.big_buttons);

        var $maximize = BarElements.maximize_bar.$maximize.closest('div').clone();
        var $login = BarElements.maximize_bar.$login.closest('div').clone();
        var $upvote = BarElements.maximize_bar.$upvote.closest('div').clone();
        var $downvote = BarElements.maximize_bar.$downvote.closest('div').clone();
        var $save = BarElements.maximize_bar.$save.closest('div').clone();
        var $comments = BarElements.maximize_bar.$comments.closest('div').clone();

        var $maximize_bar_row = BarElements.$maximize_bar.find('.row');
        $maximize_bar_row.empty();

        if (Bar.positionIsLeft()) {
            $maximize_bar_row.append($maximize, $comments, $login, $upvote, $downvote, $save);
        } else {
            $maximize_bar_row.append($login, $upvote, $downvote, $save, $comments, $maximize);
        }

        BarElements.init();
    },
    setLinksParent: function () {
        BarElements.$body.find('a').each(function () {
            myjQuery(this).attr('target', '_top');
        });
    },
    fixMaximizeBarTheme: function () {
        for (var element_name in BarElements.maximize_bar) {
            BarElements.maximize_bar[element_name].closest('div').toggleClass('light_theme', !Bar.options.dark_theme && !Bar.options.transparent_background);
            BarElements.maximize_bar[element_name].closest('div').toggleClass('dark_theme', Bar.options.dark_theme && !Bar.options.transparent_background);
            BarElements.maximize_bar[element_name].closest('div').toggleClass('content_maximize_transparent_fix', !Bar.options.transparent_background);
        }
    }
};