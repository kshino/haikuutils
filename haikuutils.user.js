// ==UserScript==
// @name           HaikuUtils
// @namespace      http://www.scrapcode.net/
// @include        http://h.hatena.ne.jp/*
// @include        http://h.hatena.com/*
// @version        1.0.0
// ==/UserScript==
(function() {
    // Select utility
    var runUtils = [
        { name: 'adColoring', args: {} },
        { name: 'imageNoResize', args: {} },
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
    }
    
    for( var i = 0; i < runUtils.length; ++i ) {
        var target = runUtils[i];
        var util   = utils[ target.name ];
        util.func();
        if( ! util.initOnly && window.AutoPagerize ) {
            window.AutoPagerize.addFilter(function(){ util.func( target.args ) });
        }
    }
})();
