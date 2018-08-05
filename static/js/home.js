var parser = new DOMParser();
var $showOnReadyCompleteEls, $myWindow;
var isFirstLoad = true;
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

function makeQueryString(params) {
    var queryString = Object.keys(params).map(function(key) {
        return key + '=' + params[key]
    }).join('&');

    return queryString;
}

function apiGet(url, params, cbs) {
    var httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
        cbs.onError()
        return false;
    }

    httpRequest.onreadystatechange = function() {
        try {
            if (httpRequest.readyState === XMLHttpRequest.DONE) {
                if (httpRequest.status === 200) {
                    cbs.onSuccess(httpRequest.responseText);
                } else {
                   cbs.onError(httpRequest.status);
                }
            }
        } catch( e ) {
            cbs.onError(e.name, e.message);
        }
    }

    if (params) {
        var queryStr = makeQueryString(params);
        url += ((/\?/).test(url) ? "&" : "?") + queryStr;
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

function updateWindow(waitMs, attempts) {
    var maxAttempts = 5;
    var attempts = attempts || 0;
    if (attempts >= maxAttempts) {
        return;
    }

    var successWaitMs = 15 * 60 * 1000
    var errorWaitMs = 60 * 1000
    var waitMs = (isFirstLoad) ? 1 : waitMs || successWaitMs;

    setTimeout(function () {
        var now = new Date();
        apiGet(
            '/api/window-data',
            {
                'timestamp': now.toISOString(),
            },
            {
                onSuccess: function (res) {
                    res = JSON.parse(res)
                    replaceWindowChild('.window__scene', '.window__scene__outside', res.window_outside_html);
                    replaceWindowChild('.window__label', '.window__label__text', res.window_label_html);
                    updateWindow(successWaitMs);
                },
                onError: function (name, message) {
                    console.error('Error Fetching Window Data: ', name, message);
                    updateWindow(errorWaitMs, attempts += 1);
                }
            }
        );
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
        isFirstLoad = false;
    },
});
