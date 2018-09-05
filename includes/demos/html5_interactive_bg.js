$(document).ready(function(){
	var canvas;  
	var ctx;
	var width = window.innerWidth - 5; //GET THE WIDTH OF THE DIV AROUND THE CANVAS
	var height = window.innerHeight - 5; //GET THE HEIGHT OF THE DIV AROUND THE CANVAS
	var circle = [];
	var m = {x:0, y:0};
	var mx, my, gmx, gmy;
    var interval, isResizing;
	
	var total_circles = 400; //SET THE # OF CIRCLES TO CREATE

    $window.on('resize', function(){
        if( !isResizing ){
            isResizing = true;
            clearInterval( interval );
            init();
            interval = setInterval(play, 40);
            isResizing = false;
        }
    });

	/************************************************************************************************************
	 *  
	 * START() :: GETS THE CANVAS ELEMENT & IF FOUND -> CALLS THE NECESSARY FUNCTIONS
	 * 
	 ************************************************************************************************************/
	function start(){
		canvas  = document.getElementById('interactiveDots');
		if(canvas.getContext){
			init();
			interval = setInterval(play, 40);
		}
	}//END START()
	
	
	/************************************************************************************************************
	 *  
	 * INIT() :: CREATES AN OBJECT FOR EACH CIRCLE W/ THE NECESSARY VARS & SETS UP THE CANVAS ELEMENT
	 * 
	 ************************************************************************************************************/
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
			circle[i].ox = circle[i].x;
			circle[i].oy = circle[i].y;
			circle[i].radius = circle[i].radiusS;
			circle[i].r = circle[i].or;
			circle[i].g = circle[i].og;
			circle[i].b = circle[i].ob;
			mx = my = gmx = gmy = 0;
		}
	}//END INIT()
		
	
	/************************************************************************************************************
	 *  
	 * CLEAR()
	 * 
	 ************************************************************************************************************/
	function clear(){
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.restore();		
	}//END CLEAR()
	
	
	/************************************************************************************************************
	 *  
	 * PLAY()
	 * 
	 ************************************************************************************************************/
	function play(){
		clear();
		ctx.globalCompositeOperation = "darker";

		//UPDATE & MOVE EACH CIRCLE ACCORDINGLY
		for(var i = 0; i < circle.length; i++ ){
			var c = circle[i];
			var x = c.x;
			var y = c.y;
			var _y = m.y - y; //CHANGE IN Y
			var _x = m.x - x; //CHANGE IN X
			var distance = Math.sqrt((_x * _x) + (_y * _y));//DISTANCE TO MOUSE
			var goingToMouse = true;
			var space_around_mouse = 50;
			var speed = 0;
			
			if( distance <= 25 ){
				c.radius = c.radiusXL;
				c.r = c.or;
				c.g = c.og;
				c.b = c.ob;
			}else if( distance <= 100){
				c.radius = c.radiusL;
				//SHADES OF RED
				c.r = c.or;
				c.g = c.b = c.ob;
			}else if( distance <= 175){
				c.radius = c.radiusM;
				//GREYS
				c.r = c.g = c.b = c.or;
			}else{
				goingToMouse = false;
				c.radius = c.radiusS;
				//WHITE
				c.r = c.g = c.b = 255;
			}
			
			//MOVE CIRCLE TOWARD MOUSE
			if(goingToMouse == true){
				speed = distance / 80;
				c.x = (c.x <= m.x && distance >= space_around_mouse) ? c.x += speed : c.x -= speed;
				c.y = (c.y <= m.y && distance >= space_around_mouse) ? c.y += speed : c.y -= speed;
			}
			
			//MOVE CIRCLE BACK TO ORIGINAL POSITION
			else{
				speed = 1;
				c.x = (c.x <= c.ox) ? c.x += speed : c.x -= speed;
				c.y = (c.y <= c.oy) ? c.y += speed : c.y -= speed;
				//STOP MOVING WHEN CLOSE ENOUGH
				if( Math.abs(c.x - c.ox) >= 0 && Math.abs(c.x - c.ox) <= 2) c.x = c.ox;
				if( Math.abs(c.y - c.oy) >= 0 && Math.abs(c.y - c.oy) <= 2) c.y = c.oy;
			}
			
			ctx.beginPath();
			ctx.arc( c.x, c.y, c.radius, 0, Math.PI * 2, false);
			ctx.fillStyle = "rgb( " +  c.r + " ," +  c.g + ", " +  c.b + " )";
			ctx.closePath();
			ctx.fill();
		}//END FOR LOOP
		
		//GET THE MOUSE POSITIONS WHEN MOUSE IS MOVED
		canvas.onmousemove = function(e){
			var rect = canvas.getBoundingClientRect();
			var ev = e ? e : window.event;
			m.x = ev.clientX - rect.left;
			m.y = ev.clientY - rect.top;
		}
		
	}//END PLAY()
	
	
	start();
				
});