var $showOnInitEls;
var css = {
    display: function(el, display) {
        el.style.display = display;
    }
}

function ready(cb) {
    if (document.readyState !='loading') {
        cb()
    } else if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', cb);
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

function beforeReady() {
    $showOnInitEls = document.querySelectorAll(".js-show-on-init");
    $showOnInitEls.forEach(function($el) {
        css.display($el, 'none')
    });
}

function updateWindow(waitMs) {
    successWaitMs = 30 * 60 * 1000
    errorWaitMs = 60 * 1000
    
    waitMs = waitMs || successWaitMs;

    setTimeout(function () {
        apiGet('/api/window-outside', {
            onSuccess: function (res) {
                res = JSON.parse(res)
                $resHTML = parser.parseFromString(res.html, "text/html");
                $newWindowOutside = $resHTML.getElementsByClassName("window__scene__outside")[0];
                $oldWindowOutside = $windowScene.getElementsByClassName("window__scene__outside")[0];
                $windowScene.replaceChild($newWindowOutside, $oldWindowOutside);
                
                updateWindow(successWaitMs);
            },
            onError: function (name, message) {
                console.error(name, message);
                updateWindow(errorWaitMs);
            }
        })
    }, waitMs);
}

beforeReady()
ready(function () {
    parser = new DOMParser();
    $windowScene = document.getElementById('window__scene');
    $showOnInitEls.forEach(function($el) {
        css.display($el, 'block')
    });

    updateWindow();
})
