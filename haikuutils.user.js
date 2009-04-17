// ==UserScript==
// @name           HaikuUtils
// @namespace      http://www.scrapcode.net/
// @include        http://h.hatena.ne.jp/*
// @include        http://h.hatena.com/*
// @version        1.4.0
// ==/UserScript==
(function() {
    // Select utility
    var runUtils = [
        // 広告をわかりやすいように背景色をつける
        { name: 'adColoring', args: {} },

        // 小さな画像が引き延ばされて大きくなる問題を解消する
        { name: 'imageNoResize', args: {} },

        // ログイン後に、「ログイン」リンクをクリックしたページに戻る
        { name: 'loginLocation', args: {} },

        // ログアウトリンクの付加
        { name: 'addLogout', args: {} },

        // Reply投稿時、別ウィンドウに遷移
        { name: 'replyToBlank', args: {} },

        // お気に入りを解除する時に確認する
        { name: 'confirmFollowRemove', args: {} },
    ];

    function xpath(context, query) {
        return document.evaluate(
            query, context, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null
        )
    }

    var utils = {};

    utils.adColoring = {
        initOnly: false,
        func: function ( args ) {
            var ads = xpath( document.body, '//div[@class="entry ad"]' );
            for( var i = 0; i < ads.snapshotLength; ++i ) {
                var ad = ads.snapshotItem(i);
                ad.style.background = '#cccccc';
            }
        },
    };

    utils.imageNoResize = {
        initOnly: true,
        func: function ( args ) {
            unsafeWindow.Hatena.Haiku.Pager.removeEventListener(
                'loadedEntries', 
                unsafeWindow.Hatena.Haiku.ImageResizer.resizeImages
            );

            var imgs = xpath( document.body, '//div[@class="body"]//img' );
            for( var i = 0; i < imgs.snapshotLength; ++i ) {
                var img = imgs.snapshotItem(i);
                img.removeAttribute( 'width' );
                img.removeAttribute( 'height' );
            }
        },
    };

    utils.loginLocation = {
        initOnly: true,
        func: function ( args ) {
            var anchors = xpath( document.body, '//ul[@id="global-menu"]/li/a' );
            var login   = 'https://www.hatena.ne.jp/login';
            for( var i = 0; i < anchors.snapshotLength; ++i ) {
                var anchor = anchors.snapshotItem(i);
                if( anchor.href.indexOf( login ) == -1 ) continue;
                anchor.href = login + '?location=' + document.location.href;
                break;
            }
        },
    };

    utils.addLogout = {
        initOnly: true,
        func: function ( args ) {
            var username = xpath( document.body, '//div[@id="header"]/p[@class="username"]' );
            if( username.snapshotLength == 0 ) return;

            var list = xpath( document.body, '//ul[@id="global-menu"]' );
            var logout  = 'https://www.hatena.ne.jp/logout';

            if( list.snapshotLength != 1 ) return;

            var link = document.createElement( 'a' );
            link.href = logout + '?location=' + document.location.href;
            link.innerHTML = 'ログアウト';

            var li = document.createElement( 'li' );
            li.appendChild( link );

            list.snapshotItem(0).appendChild( li );

            username.snapshotItem(0).style.top = '75px';
            var lists = xpath( document.body, '//ul[@id="global-menu"]/li' );
            for( var i = 0; i < lists.snapshotLength; ++i ) {
                lists.snapshotItem(i).style.lineHeight = '1.1em';
            }
        },
    };

    utils.replyToBlank = {
        initOnly: true,
        func: function ( args ) {
            var createReplyForm = unsafeWindow.Hatena.Haiku.EntryForm.createReplyForm;
            unsafeWindow.Hatena.Haiku.EntryForm.createReplyForm = function ( id ) {
                var form = createReplyForm( id );
                form.target = '_blank';
                return form;
            };
        },
    };

    utils.confirmFollowRemove = {
        initOnly: true,
        func: function ( args ) {
            var forms = xpath( document.body, '//form[@action="/follow.remove"]' );
            if( forms.snapshotLength != 1 ) return;

            var onsubmit = function ( e ) {
                if( ! confirm( 'Stop following?' ) ) {
                    e.preventDefault();
                }
            };

            var form = forms.snapshotItem( 0 );
            form.addEventListener( 'submit', onsubmit, true );
        },
    };

    for( var i = 0; i < runUtils.length; ++i ) {
        var target = runUtils[i];
        var util   = utils[ target.name ];
        if( util.func ) {
            util.func();
            if( util.initOnly ) util.func = null;
        }
        if( util.func && window.AutoPagerize ) {
            window.AutoPagerize.addFilter(function(){ if( util.func ) util.func( target.args ) });
        }
    }
})();
