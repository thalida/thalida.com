var css = {
    display: function(el, display) {
        el.style.display = display;
    }
}


var $showOnInitEls;

function preInit() {
    $showOnInitEls = document.querySelectorAll(".js-show-on-init");
    $showOnInitEls.forEach(function($el) {
        css.display($el, 'none')
    });

}

function init () {
    $showOnInitEls.forEach(function($el) {
        css.display($el, 'block')
    });
}

preInit()
document.onreadystatechange = function () {
    if (document.readyState == "complete") {
        init()
    }
}
