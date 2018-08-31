$(document).ready(function(){
	var canvas;  
	var ctx;
	var width=document.getElementById('demo_wrapper').clientWidth;
	var height=document.getElementById('demo_wrapper').clientHeight;
	var total_circles = 150;
	var circle = [];
	var mx, my, gmx, gmy;

	function start(){
		canvas  = document.getElementById('interactiveDots');
		if ( canvas.getContext ){
			init();
			setInterval( play, 40 );
		}
	}
	
	function init(){
		ctx = canvas.getContext("2d");
		canvas.width = width;
		canvas.height = height;
		
		for(var i = 0; i < total_circles; i++ ) {
			circle[i] = {
				x 			: Math.ceil(Math.random() * width + 0),
				y 			: Math.ceil(Math.random() * height + 0),
				ox 			: 0,
				oy 			: 0,
				radiusXL 	: Math.random() * 17 + 14,
				radiusL 	: Math.random() * 13 + 10,
				radiusM 	: Math.random() * 9 + 6,
				radiusS 	: Math.random() * 5 + 2,
				radius 		: 0,
				r 			: 0,
				g 			: 0,
				b 			: 0,
				or 			: Math.ceil(Math.random() * 255),
				og 			: Math.ceil(Math.random() * 255),
				ob 			: Math.ceil(Math.random() * 255)
			};
			circle[i].tx = circle[i].ox = circle[i].x;
			circle[i].ty = circle[i].oy = circle[i].y;
			circle[i].radius = circle[i].radiusS;
			circle[i].r = circle[i].or;
			circle[i].g = circle[i].og;
			circle[i].b = circle[i].ob;
			mx = my = gmx = gmy = 0;
		}
	}
		
	
	function clear(){
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.restore();		
	}
	
	function play(){
		clear();
		ctx.globalCompositeOperation = "darker";
		mx = gmx;
		my = gmy;

		for(var i = 0; i < circle.length; i++ ){
			var c = circle[i];
			var x = goToX = c.x;
			var y = goToY = c.y;
			var speedx, speedy;
			var deg = Math.ceil( Math.random() * 360 );
			
			goToX = mx;
			goToY = my;
				
			if( (Math.abs(mx - x) <= 20) && (Math.abs(my - y) <= 20) ){
				c.radius = c.radiusXL;
				c.r = c.or;
				c.g = c.og;
				c.b = c.ob;
			} else if( (Math.abs(mx - x) <= 60) && (Math.abs(my - y) <= 60)  ){	
				c.radius = c.radiusL;
				c.r = c.or;
				c.g = c.og;
				c.b = c.og;
			} else if( (Math.abs(mx - x) <= 110) && (Math.abs(my - y) <= 110)  ){	
				c.radius = c.radiusM;
				c.r = c.g = c.b = c.og;
			} else {
				goToX = c.ox;
				goToY = c.oy;
				c.radius = c.radiusS;
				c.r = c.g = c.b = 255;
			}
			
			speedx = Math.ceil( Math.cos( (goToX - x) % 360 / Math.PI * 180 ) );
			speedx = ( speedx > 0 ) ? speedx : 1;
			speedy = Math.ceil( Math.sin( (goToY - y) % 360 / Math.PI * 180 ) );
			speedy = ( speedy > 0 ) ? speedy : 1;
			
			if((Math.abs(goToX - x) >= 10)){
				if(goToX - x < 0) x -= speedx;
				else x += speedx;
			}
			
			if((Math.abs(goToY - y) >= 10)){
				if(goToY - y < 0) y -= speedy;
				else y += speedy;
			}
			
			c.x = x;
			c.y = y;
			
			ctx.beginPath();
			ctx.arc( c.x, c.y, c.radius, 0, Math.PI * 2, false);
			ctx.fillStyle = "rgb( " +  c.r + " ," +  c.g + ", " +  c.b + " )";
			ctx.closePath();
			ctx.fill();
		}
		
		canvas.onmousemove = function(e){
			var ev = e ? e : window.event;
			gmx = e.clientX;
			gmy = e.clientY;
		}
	
	}
	
	
	start();
				
});