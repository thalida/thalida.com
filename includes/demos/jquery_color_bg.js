
var highNum = 155, lowNum = 0, changeNum = 20;
var r = highNum, g = lowNum, b = lowNum;

$(document).ready(function(){
    $('#canvas_wrapper').css({width: window.innerWidth - 5, height: window.innerHeight - 5 });
    changeBackground();
    setInterval(changeBackground, 1000);
});

function changeBackground(){
    var h = highNum;
    var l = lowNum;
    var i = changeNum;
    var bg_hex;

    if(g == l && r == h && ( b >= l && b < h )) b += i;
    else if(g == l && b == h && ( r > l && r <= h )) r -= i;
    else if(r == l && b == h && ( g >= l && g < h )) g += i;
    else if(r == l && g == h && ( b > l && b <= h )) b -= i;
    else if(b == l && g == h && ( r >= l && r < h )) r += i;
    else if(b == l && r == h && ( g > l && g <= h )) g -= i;

    bg_hex = toHex(r, g, b);
    $('#canvas_wrapper').css('background',bg_hex);
}

function toHex(r, g, b) { return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }