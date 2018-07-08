var parser = new DOMParser();
var $showOnReadyCompleteEls, $myWindow;
var css = {
    display: function(el, display) {
        el.style.display = display;
    }
}

function readyStateChange(cbs) {
    document.onreadystatechange = function () {
        switch(document.readyState) {
            case "interactive":
                cbs.onInteractive();
                break;
            case "complete":
                cbs.onComplete();
                break;
        }
    }
}

function apiGet(url, cbs) {
    var httpRequest = new XMLHttpRequest();
    var reqCbs = {
        onError: function () {},
        onSuccess: function () {},
    };
    
    if (typeof cbs.onError === 'function') {
        reqCbs.onError = cbs.onError;
    }
    
    if (typeof cbs.onSuccess === 'function') {
        reqCbs.onSuccess = cbs.onSuccess;
    }

    if (!httpRequest) {
        reqCbs.onError()
        return false;
    }

    httpRequest.onreadystatechange = function() {
        try {
            if (httpRequest.readyState === XMLHttpRequest.DONE) {
                if (httpRequest.status === 200) {
                    reqCbs.onSuccess(httpRequest.responseText);
                } else {
                   reqCbs.onError(httpRequest.status);
                }
            }
        } catch( e ) {
            reqCbs.onError(e.name, e.message);
        }
    }

    httpRequest.open('GET', url + ((/\?/).test(url) ? "&" : "?") + (new Date()).getTime(), true);
    httpRequest.send(null);

    return httpRequest;
}

function replaceWindowChild(parentSelector, childSelector, html) {
    var $newDOM = parser.parseFromString(html, "text/html");
    var $newEl = $newDOM.querySelector(childSelector);
    var $oldEl = document.querySelector(childSelector);
    $myWindow.querySelector(parentSelector).replaceChild($newEl, $oldEl);
}

function updateWindow(waitMs) {
    var successWaitMs = 30 * 60 * 1000
    var errorWaitMs = 60 * 1000

    var waitMs = waitMs || successWaitMs;

    setTimeout(function () {
        apiGet('/api/window-data', {
            onSuccess: function (res) {
                res = JSON.parse(res)
                replaceWindowChild('.window__scene', '.window__scene__outside', res.window_outside_html);
                replaceWindowChild('.window__label', '.window__label__text', res.window_label_html);
                updateWindow(successWaitMs);
            },
            onError: function (name, message) {
                console.error(name, message);
                updateWindow(errorWaitMs);
            }
        })
    }, waitMs);
}

readyStateChange({
    onInteractive: function () {
        $showOnReadyCompleteEls = document.querySelectorAll('[data-show-on-readystate-complete]');
        $showOnReadyCompleteEls.forEach(function($el) {
            css.display($el, 'none')
        });

        $myWindow = document.querySelectorAll('[data-window]')[0];
    },
    onComplete: function () {
        $showOnReadyCompleteEls.forEach(function($el) {
            css.display($el, 'block')
        });
        
        updateWindow();
    },
});
