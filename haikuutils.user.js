// ==UserScript==
// @name           HaikuUtils
// @namespace      http://www.scrapcode.net/
// @include        http://h.hatena.ne.jp/*
// @include        http://h.hatena.com/*
// @version        1.7.1
// ==/UserScript==
(function() {
    // Select utility
    var runUtils = [
        // 広告をわかりやすいように背景色をつける
        { name: 'adColoring', args: { color: '#ededed' } },

        // 小さな画像が引き延ばされて大きくなる問題を解消する
        { name: 'imageNoResize', args: {} },

        // ログイン後に、「ログイン」リンクをクリックしたページに戻る
        { name: 'loginLocation', args: {} },

        // ログアウトリンクの付加
        { name: 'addLogout', args: {} },

        // Reply投稿時、別ウィンドウに遷移
//        { name: 'replyToBlank', args: {} },

        // お気に入りを解除する時に確認する
        { name: 'confirmFollowRemove', args: {} },

        // お気に入りに追加する時に確認する
        { name: 'confirmFollowAdd', args: {} },

        // docomoマップのURLをGoogleマップのURLに置換する
        { name: 'docomoMapToGoogleMap', args: {} },

        // Import Star Friends実行時に確認する
        { name: 'confirmImportStarFriends', args: {} },

        // idリンク不具合対処(idea:25073)
//        { name: 'repairIdLink', args: {} },
    ];

    location.host.match( /\.hatena\.(.+)/ );
    const DOMAIN = RegExp.$1;
    const GMAP   = 'http://maps.google.com/maps?q=';
    const ID_REGEXP = '[a-zA-Z][a-zA-Z0-9_-]{1,30}[a-zA-Z0-9]';

    function xpath( context, query ) {
        var items = document.evaluate(
            query, context, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null
        );

        var elements = [];
        for( var i = 0; i < items.snapshotLength; ++i ) {
            elements.push( items.snapshotItem( i ) );
        }

        return elements;
    }

    function parseQueryParam( url, forceArrayKeys ) {
        if( ! url.match( /\?(.*)/ ) ) return null;

        var params = RegExp.$1.split( '&' );
        var hash   = {};
        var i;
        if( typeof( forceArrayKeys ) == 'Array' ) {
            for( i = 0; i < forceArrayKeys.length; ++i ) {
                hash[ forceArrayKeys[i] ] = [];
            }
        }

        for( i = 0; i < params.length; ++i ) {
            var p   = params[i].split( '=' );
            var key = decodeURIComponent( p[0] );
            var val = decodeURIComponent( p[1] );
            if( hash[key] ) {
                if( typeof( hash[key] ) != 'Array' ) {
                    hash[key] = [ hash[key] ];
                }
                hash[key].push( val );
            }else {
                hash[key] = val;
            }
        }

        return hash;
    }

    function dmsToDeg( dms ) {
        if( ! dms.match( /^([-+]?)(\d+)\.(\d+)\.(\d+\.\d+)$/ ) ) return null;

        var pm  = RegExp.$1;
        var deg = 1 * RegExp.$2 + RegExp.$3 / 60.0 + RegExp.$4 / 3600.0;
        if( pm == '-' ) deg *= -1;

        return Math.floor( deg * 1000000 ) / 1000000;
    }

    var utils = {};

    utils.adColoring = {
        initOnly: false,
        func: function ( args ) {
            var ads = xpath( document.body, '//div[@class="entry ad"]' );
            for( var i = 0; i < ads.length; ++i ) {
                var ad = ads[i];
                ad.style.background = args.color;
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
            for( var i = 0; i < imgs.length; ++i ) {
                var img = imgs[i];
                if( typeof( img['width']  ) != 'undefined' ) img.removeAttribute( 'width' );
                if( typeof( img['height'] ) != 'undefined' ) img.removeAttribute( 'height' );
            }
        },
    };

    utils.loginLocation = {
        initOnly: true,
        func: function ( args ) {
            var anchors = xpath( document.body, '//ul[@id="global-menu"]/li/a' );
            var login   = 'https://www.hatena.' + DOMAIN + '/login';
            for( var i = 0; i < anchors.length; ++i ) {
                var anchor = anchors[i];
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
            if( username.length == 0 ) return;

            var list = xpath( document.body, '//ul[@id="global-menu"]' );
            var logout  = 'https://www.hatena.' + DOMAIN + '/logout';

            if( list.length != 1 ) return;

            var link = document.createElement( 'a' );
            link.href = logout + '?location=' + document.location.href;
            link.innerHTML = DOMAIN == 'ne.jp' ? 'ログアウト': 'Sign Out';

            var li = document.createElement( 'li' );
            li.appendChild( link );

            list[0].appendChild( li );

            username[0].style.top = '75px';
            var lists = xpath( document.body, '//ul[@id="global-menu"]/li' );
            for( var i = 0; i < lists.length; ++i ) {
                lists[i].style.lineHeight = '1.1em';
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
            if( forms.length != 1 ) return;

            var onsubmit = function ( e ) {
                if( ! confirm( 'Stop following?' ) ) e.preventDefault();
            };

            forms[0].addEventListener( 'submit', onsubmit, true );
        },
    };

    utils.confirmFollowAdd = {
        initOnly: true,
        func: function ( args ) {
            var forms = xpath( document.body, '//form[@action="/follow"]' );
            if( forms.length != 1 ) return;

            var onsubmit = function ( e ) {
                if( ! confirm( 'Add favorites?' ) ) e.preventDefault();
            };

            forms[0].addEventListener( 'submit', onsubmit, true );
        },
    };

    utils.docomoMapToGoogleMap = {
        initOnly: false,
        func: function ( args ) {
            var links = xpath( document.body, '//div[@class="entry"]//div[@class="body"]//a' );
            var reg_map = /http:\/\/docomo\.ne\.jp\/cp\/map\.cgi\?/;
            for( var i = 0; i < links.length; ++i ) {
                var link = links[i];
                if( ! link.href.match( reg_map ) ) continue;

                var param = parseQueryParam( link.href );
                var url   = GMAP + dmsToDeg( param.lat ) + ',' + dmsToDeg( param.lon );

                link.href = url;
                link.textContent = url;
            }
        },
    };

    utils.confirmImportStarFriends = {
        initOnly: true,
        func: function ( args ) {
            var forms = xpath( document.body, '//form[@action="/import"]' );
            if( forms.length != 1 ) return;

            var onsubmit = function ( e ) {
                if( ! confirm( 'Import Star Friends?' ) ) e.preventDefault();
            };

            forms[0].addEventListener( 'submit', onsubmit, true );
        },
    };

    utils.repairIdLink = {
        initOnly: false,
        func: function ( args ) {
            var entries = xpath( document.body, '//div[@class="entry"]//div[@class="body"]' );
            var id_regexp = new RegExp( '^' + ID_REGEXP + '$' );
            var id_syntax = new RegExp( 'id:(' + ID_REGEXP + ')', 'g' );
            var anchor_cb = function ( all, id, text ) {
                if( id.match( id_regexp ) ) return all;

                return text.replace(
                    id_syntax,
                    '<a href="/$1/" class="user">id:$1</a>'
                );
            };

            for( var i = 0; i < entries.length; ++i ) {
                var entry = entries[i];
                entry.innerHTML = entry.innerHTML.replace(
                    /<a\s+href="\/([^/]+)\/"\s+class="user">(.+?)<\/a>/g,
                    anchor_cb
                );
            }

        },
    };

    for( var i = 0; i < runUtils.length; ++i ) {
        var target = runUtils[i];
        var util   = utils[ target.name ];
        if( util.func ) {
            util.func( target.args );
            if( util.initOnly ) util.func = null;
        }

        if( ! util.func ) continue;

        var func = function() {
            if( util.func ) util.func( target.args );
        };
        if( window.AutoPagerize ) {
            window.AutoPagerize.addFilter( func );
        }else {
            unsafeWindow.Hatena.Haiku.Pager.addEventListener( 'loadedEntries', func );
        }
    }
})();
