var css = {
    display: function(el, display) {
        el.style.display = display;
    }
}

function preInit() {
    var $elems = document.querySelectorAll(".js-show-on-init");
    $elems.forEach(function($el) {
        css.display($el, 'none')
    });

}

function init () {
    var $elems = document.querySelectorAll(".js-show-on-init");
    $elems.forEach(function($el) {
        css.display($el, 'block')
    });
}

preInit()
document.onreadystatechange = function () {
    if (document.readyState == "complete") {
        init()
    }
}
