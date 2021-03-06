/* global Utils, myjQuery */

var Options = {
    option_prefix: 'option_',
    default_options: {
        fluid_container: false,
        dark_theme: false,
        transparent_background: false,
        disable_shadow: false,
        start_minimized: false,
        bar_location_bottom: false,
        maximize_location_left: false,
        hide_mod_icons: false,
        show_maximize_action_icons: false,
        persist_bar: false,
        disable_unread_messages: false,
        disable_multireddit_bar: false,
        enable_tabs_not_opened_by_user_interaction: false,
        hide_labels: false,
        big_buttons: false,
        hide_reddit: false,
        hide_score: false,
        hide_subreddit: false,
        hide_comments: false,
        hide_save: false
    },
    deleteOptions: [
        'fluid_container', 'dark_theme', 'transparent_background', 'disable_shadow', 'start_minimized', 'bar_location_bottom', 'maximize_location_left', 'hide_mod_icons', 'show_maximize_action_icons', 'persist_bar', 'disable_unread_messages', 'disable_multireddit_bar', 'enable_tabs_not_opened_by_user_interaction'
    ],
    init: function () {
        Options.restoreOptions();

        myjQuery('#predefined_settings').on('change', function () {
            var $this = myjQuery(this);
            var selected_value = $this.val();

            Options.getOptions(function (options) {
                switch (selected_value) {
                    case 'default':
                        options = myjQuery.extend(Options.default_options);
                        break;

                    case 'full':
                        options.hide_labels = false;
                        options.big_buttons = true;
                        options.hide_reddit = false;
                        options.hide_score = false;
                        options.hide_subreddit = false;
                        options.hide_comments = false;
                        options.hide_save = false;
                        break;

                    case 'compact':
                        options.hide_labels = true;
                        options.big_buttons = false;
                        options.hide_reddit = false;
                        options.hide_score = false;
                        options.hide_subreddit = false;
                        options.hide_comments = false;
                        options.hide_save = false;
                        break;

                    case 'useful':
                        options.hide_labels = false;
                        options.big_buttons = false;
                        options.hide_reddit = true;
                        options.hide_score = true;
                        options.hide_subreddit = true;
                        options.hide_comments = false;
                        options.hide_save = false;
                        break;

                    case 'minimal':
                        options.hide_labels = true;
                        options.big_buttons = false;
                        options.hide_reddit = true;
                        options.hide_score = true;
                        options.hide_subreddit = true;
                        options.hide_comments = true;
                        options.hide_save = true;
                        break;
                }

                for (var delete_option in Options.deleteOptions) {
                    delete options[Options.deleteOptions[delete_option]];
                }

                Options.setOptions(options);

                window.setTimeout(function () {
                    // small timeout for the user to understand that the change worked (instead of instantly changing it)
                    $this.prop('selectedIndex', 0);
                }, 50);

                Options.saveOptions();
            });
        });

        myjQuery('input[type="checkbox"]').on('change', function () {
            if (myjQuery(this).is(':checked')) {
                switch (Options.getDataKeyFromElement(myjQuery(this))) {
                    case 'dark_theme':
                        Options.setOptionCheckedProp('transparent_background', false);
                        break;

                    case 'transparent_background':
                        Options.setOptionCheckedProp('dark_theme', false);
                        break;
                }
            }

            Options.saveOptions();
        });
    },
    getOptions: function (callback) {
        var options = myjQuery.extend(Options.default_options);

        Utils.myStorageGet(Object.keys(options), function (stored_options) {
            for (var option in options) {
                if (!Utils.varIsUndefined(stored_options[option])) {
                    options[option] = stored_options[option];
                }
            }

            if (Utils.varIsFunction(callback)) {
                callback(options);
            }
        });
    },
    restoreOptions: function () {
        Options.getOptions(function (options) {
            Options.setOptions(options);
        });
    },
    setOptions: function (options) {
        for (var option in options) {
            Options.setOptionCheckedProp(option, options[option]);
        }
    },
    setOptionCheckedProp: function (key, value) {
        myjQuery(`#${Options.option_prefix}${key}`).prop('checked', value);
    },
    saveOptions: function () {
        var data = {};
        myjQuery(`[id^=${Options.option_prefix}]`).each(function () {
            data[Options.getDataKeyFromElement(myjQuery(this))] = myjQuery(this).is(':checked');
        });

        Utils.myConsoleLog('info', 'Saving data to local storage', data);

        Utils.getBrowserOrChromeVar().storage.local.set(data);
    },
    getDataKeyFromElement: function ($element) {
        return $element.prop('id').replace(Options.option_prefix, '');
    }
};

myjQuery(document).ready(function () {
    Options.init();
});