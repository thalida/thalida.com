/*  =============================================================================================
    |
    | THALIDA.COM MAIN JAVASCRIPT FILE (INIT.JS) [LAST UPDATED: 12/23/12]
    |
    | LIKE MY CODE? WELL... I'M LOOKING FOR A FULL-TIME JOB!
    |
    ============================================================================================	*/
   

/*  ======================================================
    | GLOBAL VARIABLES
    ======================================================	*/
    var $window,
        $scrollpane,
        $accordion,
        $header_links,
        $search_form,
        $portfolio_items,
        $portfolio_sidebar,
        sidebar_offset,
        search_default,
        search_suggestion = 'HTML5',
        prev_search = null,
        isStart = isMobile = isResizing = isSearching = onSearchPage = onViewItemPage = false,
        acc_open_pane = acc_default_pane = acc_welcome_pane = '#welcome-wrapper',
        acc_hidden_pane = '#hidden-wrapper',
        loading_text = '<div id="loading-alert">Loading Content...</div>',
        viewItemType,
        scroller_api,
        sidebar_api,
        History;
	
	
/*  ======================================================
   |
   | JQUERY STARTS HERE! WOOT! =^.^=
   |
    ======================================================	*/
	(function(window,undefined){
        isStart = true;

        if( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) isMobile = true;

		/*====  HISTORY.JS SETUP | IT'S AMAZING! CHECK IT OUT!  ====*/
        History = window.History;
        if ( !History.enabled )  return false;
        History.Adapter.bind(window,'statechange',parse_url);
	    
		/*====  SITE OVERLAY (SHOWN WHILE LOADING)  ====*/
		$('#loading-overlay').show();
		
		/*====  LOAD OBJECTS  ====*/
		$window = $(window);
		$scrollpane = $('#wrapper');
		$accordion = $('#accordion-container'); //SLIDE DOWN SECTION
		$header_links = $('.header-link'); //MAIN MENU LINKS
		$search_form = $('#search-form'); //SEARCH BOX
		search_default = $('#search-input').val(); //DEFAULT TEXT IN SEARCH BOX
		
		/*====  LOAD THE CORRECT PAGE BASED ON URL  ====*/
		parse_url();
		
		/*====  SETUP FOR PRETTY SCROLLBAR (GETTING RID OF THE UGLY DEFAULT STUFF)  ====*/
		$('body').css('overflow', 'hidden');
		if ($scrollpane.width() != $window.width()) $window.trigger('resize');

	/*	======================================================
		WINDOW.RESIZE()
		======================================================	*/	
		$window.on('resize', resizer).trigger('resize');
		
			
	/*	======================================================
		WINDOW.LOAD()
		======================================================	*/	
		$window.load(function(){
			resizer();
			$('#loading-overlay').fadeOut(1000);
		});

    /*	======================================================
         SCROLLPANE ON SCROLL
        ======================================================	*/
        $scrollpane.on('jsp-scroll-y', function(event, scrollPosY, isAtTop, isAtBottom){
            if( onViewItemPage == true && viewItemType == 'project' ){
                if(scrollPosY > sidebar_offset.top){
                    $portfolio_sidebar.addClass('fixed');
                    //$portfolio_sidebar.wrapInner('<div />');
                    //$portfolio_sidebar.children('div').jScrollPane({ 'showArrows': false, autoReinitialise: true });
                    //sidebar_api = $portfolio_sidebar.children('div').jScrollPane().data().jsp;
                }else{
                    //$portfolio_sidebar.children('div').replaceWith( $portfolio_sidebar.children('div').contents() );
                    $portfolio_sidebar.removeClass('fixed');
                }
            }
        });
		
        
/*--------------------------------------------------------------------------------------------------------------------------*/			
/*-----------------------------------------  MAIN NAVIGATION EVENTS/EFFECTS/SETUP  -----------------------------------------*/
/*--------------------------------------------------------------------------------------------------------------------------*/
			
	/*	======================================================
		HEADER MENU TOOLTIPS => NOT ON MOBILE DEVICES
		======================================================	*/
		if(isMobile == false){
            $('.link-tooltip').tooltip({
                tooltipClass: "header-tooltip",
                position: {
                    my: "center top+10", at: "center bottom",
                    using: function( position, feedback ) {
                        $( this ).addClass('header-tooltip');
                        $( this ).css( position );
                        $( "<div>" ).addClass( "arrow" ).addClass( feedback.vertical ).addClass( feedback.horizontal ).appendTo( this );
                    }
                }
            });
        }

        
        
	/*	======================================================
		ACCORDION LINKS
		======================================================	*/
		$header_links.on('click',function(){
			var $this = $(this);

			/*=  IF A SLIDING ANIMATION IS NOT ALREADY HAPPENING | THIS STOPS QUEUE BUILD UP & UGLINESS FROM HAPPENING =*/
			if (!$accordion.hasClass('animated')){
				$header_links.removeClass('selected');

				var clicked_section = '#' + $(this).attr('id').split('-')[0] + "-wrapper";
				acc_open_pane = (acc_open_pane == clicked_section) ? acc_default_pane : clicked_section;
				if(acc_open_pane != acc_hidden_pane) $accordion.after(loading_text);
					
				/*= START ACCORDION SLIDE UP/DOWN ANIMATIONS & LOAD CONTENT =*/
				$accordion.addClass('animated').animate({height: 'toggle'}, {duration: 700, complete: function() {
					if(acc_open_pane != acc_default_pane) $this.addClass('selected');
					$accordion.load('/includes/pages/container_text.html ' + acc_open_pane, function(){
						$('#loading-alert').remove();
						$accordion.animate({height: 'toggle'}, 600, function(){ $accordion.removeClass('animated'); });
						/*= MAKE PRETTY SKILLS CHART =*/
						if(acc_open_pane == '#about-wrapper') setup_chart();
					});
				}});
			}
		});
		
		
	/*	======================================================
		PORTFOLIO LINK
		======================================================	*/
		$('#portfolio-link').on('click', function(){ 
			if(onSearchPage == true || isSearching == true) $search_form.children('input').val( search_default ).trigger('blur');
            else if(onViewItemPage == true) set_history(null, null, '?page=main');
		}); 


/*------------------------------------------------------------------------------------------------------------------------------*/			
/*----------------------------------------------------  PORTFOLIO PAGE  --------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------------------------------*/	
	
	/*	======================================================
		PORTFOLIO ITEM EVENTS & EFFECTS
		======================================================	*/
		$(document).on('click', '#container-items article.item', function(e){
            set_history(null, null, '?page=' + $(this).data('pk'));
			e.preventDefault();
		});


/*------------------------------------------------------------------------------------------------------------------------------*/			
/*-----------------------------------------------------  SEARCH BOX AREA  ------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------------------------------*/

	/*	======================================================
		SEARCH BOX EVENTS
		======================================================	*/
		/*==== EVENT --> SEARCHBOX => MOUSEOVER ====*/	
		$search_form.on('mouseover', function(){
			$(this).removeClass('search-default').addClass('search-hover');
			$('#search-input').removeClass('search-input-default').addClass('search-input-active');
		})
		/*==== EVENT --> SEARCHBOX => MOUSEOUT ====*/	
		.on('mouseout', function(){
			$(this).removeClass('search-hover').addClass('search-default');
			$('#search-input').removeClass('search-input-active').addClass('search-input-default');
			$search_form.children('input').trigger('blur');
		});
		
		
	/*	======================================================
		SEARCH FORM EVENT -> KEY UP 
		======================================================	*/
		$search_form.children('input').on('keyup', function(e){
            var query = $.trim($(this).val().toLowerCase());
            var isSameQuery = false;
            if( prev_search != query ) prev_search = query;
            else isSameQuery = true;

			$(this).parent().removeClass('search-error');
			$('#search-error-text').remove();
			
			/*==== IF VALID QUERY (ONLY ALPHANUMERIC CHARACTERS) ====*/
			if( /^[a-z0-9\s,]+$/.test(query) && query.length >= 3 && isSameQuery == false){
				onSearchPage = true;

				/*= SET ACCORDION TO HIDDEN PANE =*/
				set_accordion( acc_hidden_pane );

				/*= REMOVED CLASSES & UNNECESSARY OBJECTS =*/
				$header_links.removeClass('selected');
				$('#search-header').remove();
				$('#portfolio-link').removeClass('selected').attr('title','Return to Portfolio');
                $portfolio_items.hide();

                /*= REPLACE SPACES IN QUERY TO COMMAS =*/
                var split_query = query.split(/[\s,]+/);
                var comma_separated = comma_separate_query(split_query);
                $('#container-items').before('<div id="search-header"><span id="search-query">Showing results for ' + comma_separated + '</span></div>');

                /*= LOAD THE CORRECT PORTFOLIO ITEMS BASED ON QUERY | DISPLAY ERROR IF NONE FOUND =*/
                var found_items = load_portfolio('search',split_query);
                if(found_items.length > 0) $.each(found_items,function(i,obj){ $(obj).show(); });
				else  $('#search-header').append('<span id="search-no-results">I\'m sorry, but no results where found. You can try searching for "'+ search_suggestion +'" instead!</span>');   
			}
			/*==== NOT A VALID QUERY => SHOW ERROR ====*/
			else{
                if( isSameQuery == false ){
                    var error = '';
                    $(this).parent().addClass('search-error');
                    if(/^[a-z0-9\s,]+$/.test(query) == false)  error = 'a-z, 0-9, commas and spaces only';
                    else if($(this).val().length > 0 && $(this).val().length < 3)  error = 'minimum of 3 characters';
                    else  error = 'input cannot be empty';

                    $(this).parent().after('<div id="search-error-text">'+error+'</div>');
                }
			}
		});
		
		
	/*	======================================================
		SEARCH FORM EVENT -> FOCUS
		======================================================	*/	
		$search_form.children('input').on('focus', function(){
			isSearching = true;
			$(this).parent().addClass('search-focus');
			if($(this).val() == search_default) $(this).val('')
		});
		
		
	/*	======================================================
		SEARCH FORM EVENT -> BLUR
		======================================================	*/	
		$search_form.children('input').on('blur', function(){
			$(this).parent().removeClass('search-focus');
			if($(this).val().length == 0 || $(this).val() == search_default){
                $search_form.removeClass('search-error').show();
                $search_form.children('input').val( search_default );
                $('#search-header').remove();
                $('#search-error-text').remove();

				if(onSearchPage == true) load_portfolio('list');
                isSearching = false;
			}
		});
	})(window);
/*=========================================================================================================================*/
/*============================================  END  OF $(function(){ ... });  ============================================*/
/*=========================================================================================================================*/



/*  ======================================================
    | FUNCTION PARSE_URL() => RETURNS NOTHING
    | CALLED ON LOAD TO GET THE URL(USING HISTORY.JS)
    | AND LOAD THE CORRECT DATA/INFO VIA AJAX
    ======================================================	*/
    function parse_url(){
        /*= GET THE ROOT (AND ROOT LENGTH) USING HISTORY.JS =*/
        var root_len = History.getRootUrl().length;
        var root = History.getRootUrl().substring(0,root_len-1);

        /*= TAKE OUT THE ROOT FROM THE URL TO GET THE RELATIVE PATH & PARSE IT TO GET THE CURRENT PAGE =*/
        var relative_url = History.getState().url.replace(root,'');
        relative_url = relative_url.replace('/','');
        relative_url = ( relative_url.charAt(0) == '#') ? relative_url.replace('#?page=','') : relative_url.replace('?page=','');

        if( parseInt(relative_url) > 0 ) load_portfolio('item',parseInt(relative_url));
        else load_portfolio('list');
    }


/*  ======================================================
    | FUNCTION RESIZER() => RETURNS NOTHING AT ALL
    | CALLED WHEN WINDOW RESIZES [SHOCKING I KNOW!]
    ======================================================	*/
    function resizer(){
    	if (!isResizing) {
			isResizing = true;

            if(isMobile == false){
                /*= RESET THE SIZING OF THE SCROLLPANE =*/
                $scrollpane.css({'width': 1,'height': 1}); //DONE BASED ON SUGGESTION AS A RESULT OF BUG IN SIZING
                $scrollpane.css({ 'width':$window.width(),'height':$window.height()});
            }


			/*= IF ABOUT ACCORDION IS OPEN -> RESIZE THE CHART =*/
	    	if(acc_open_pane == "#about-wrapper"){
	    		$('#about-inner').css({ 'width' : "100%"});
	    		if($('#chart-wrapper').css('display') != 'none'){
	    			var total_width = $('#about-inner').width();
		    		var button_width = ($('#about-inner .button').outerWidth() * 2);
		    		var avail_width = total_width - button_width - 20;
		    		var total_bars = $('.bar').length;
		    		var bar_width = Math.floor( avail_width / (total_bars + 0) );
		    		var bar_margin = Math.floor(bar_width / 4);
		    		bar_width -= bar_margin;
		    		var chart_width = Math.floor((bar_width + bar_margin) * total_bars);
		    		var chart_margin = Math.abs( Math.floor((avail_width - chart_width) / 2) );
		    		$('.key').css({marginLeft:bar_margin/2});
		    		$('.bar').css({width:bar_width, marginRight:bar_margin/2, marginLeft:bar_margin/2});
		    		$('#chart-wrapper').css({marginLeft:chart_margin, marginRight:chart_margin});
	    		}
	    	}

            if(isMobile == false){
                $scrollpane.jScrollPane({ 'showArrows': false, autoReinitialise: true, contentWidth: 300 });
                scroller_api = $scrollpane.data('jsp');
            }

            isResizing = false;
		}
    }
    
    
/*  ======================================================
   | FUNCTION SETUP_CHART() => RETURNS NOTHING AT ALL
   | CALLED WHEN ABOUT ACCORDION IS OPEN
    ======================================================	*/
    function setup_chart(){
    	resizer(); //CALLS RESIZER TO MAKE SURE CHART FITS IN THE VIEWPORT
    	
    	/*= SET PRETTY COLORS FOR CHART | COLORS ARE RANDOM EVERY TIME =*/
    	var r, g, b;
    	$('.bar').each(function(index){
    		r = Math.floor((Math.random()*255));
    		b = g = Math.floor((Math.random()*225)+30);
    		$(this).css({backgroundColor:toHex(r,g,b)});
    	});
    	$('.bar')
            .on('mouseover',function(){ $(this).addClass('bar-selected'); })
            .on('mouseout',function(){ $(this).removeClass('bar-selected'); })
    	    .slideUp(400)
            .slideDown(1050)
    	    .tooltip({
                position:{
                    my: "center bottom-15",
                    at: "center top",
                    using: function( position, feedback ) {
                        $( this ).css( position );
                        $( "<div>" ).addClass( "arrow" ).addClass( feedback.vertical ).addClass( feedback.horizontal ).appendTo( this );
                    }
                }
            });
    }
    
   
/*  ======================================================
   | FUNCTION TOHEX(R,G,B) => RETURNS HEX VALUE
   | CALLED BY SETUP_CHART TO MAKE PRETTY COLORS
    ======================================================	*/ 
    function toHex(r, g, b) { return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }


/*  ======================================================
    | FUNCTION SET_HISTORY( DATA[NULL], TITLE[NULL], URL ) => RETURNS NOTHING AT ALL
    | USING HISTORY.JS TO CHANGE URL
    ======================================================	*/
    function set_history(data,title,url){ History.pushState(null,null,url); }


/*  ======================================================
    | FUNCTION SET_ACCORDION( SECTION ) => RETURNS NOTHING
    | SET THE ACCORDION TO SHOW A PARTICULAR SECTION
    ======================================================	*/
    function set_accordion( section ){
        if( !$accordion.hasClass('animated') ){
            if( section == acc_hidden_pane && acc_open_pane != acc_hidden_pane ){
                acc_open_pane = acc_default_pane = acc_hidden_pane;
                $accordion.addClass('animated').slideUp(100).load('/includes/pages/container_text.html ' + acc_open_pane, function(){
                    $accordion.slideDown(200).removeClass('animated');
                });
            }else if(section == acc_welcome_pane){
                acc_open_pane = acc_default_pane = acc_welcome_pane;
                $accordion.addClass('animated').hide().load('/includes/pages/container_text.html ' + acc_open_pane, function(){
                    $accordion.slideDown(400, function(){
                        $accordion.removeClass('animated');
                    });
                });
            }
        }
    }


/*  ======================================================
    | FUNCTION COMMA_SEPARATE_QUERY() => RETURNS NOTHING
    | COMMA SEPARATE THE SEARCH QUERY
    |   - WEB HTML5 CSS3/CSS => 'WEB', 'HTML5', AND 'CSS3'
    ======================================================	*/
    function comma_separate_query( query_arr ){
        var str = '';
        $.each(query_arr, function(index, value){
            var prepend;
            if(index == 0)  prepend = '';
            else if(query_arr.length == index+1)  prepend = ', and ';
            else  prepend = ', ';
            str += prepend + '<span>&ldquo;' + value + '&rdquo;</span>';
        });
        return str;
    }


/*  ======================================================
    | FUNCTION LOAD_PORTFOLIO( ACTION, DATA[OPTIONAL] )
    |   -> ACTIONS : 'LIST', 'ITEM', AND 'SEARCH'
    |   -> RETURNS LIST OF ELEMENTS WHEN ON 'SEARCH'
    | LOADS/DISPLAYS THE SITE CONTENT
    ======================================================	*/
    function load_portfolio(action,data){
        if(isMobile == false){
            $scrollpane.css({'width': 1,'height': 1}); //DONE BASED ON SUGGESTION AS A RESULT OF BUG IN SIZING
            $scrollpane.css({ 'width':$window.width(),'height':$window.height()});
            $scrollpane.jScrollPane({ 'showArrows': false, autoReinitialise: true, contentWidth: 300 });
            scroller_api = $scrollpane.data('jsp');
            scroller_api.scrollTo(0,0);
        }

        /*====  LIST ALL PORTFOLIO ITEMS  ====*/
    	if(action == 'list'){
            $('#container-items').html(loading_text).load('/includes/pages/main.php', function(){
                /*= RESETS ON PAGE ELEMENTS =*/
                $header_links.show();
                $search_form.removeClass('search-error').show();
                $search_form.children('input').val( search_default );
                $('#portfolio-link').addClass('selected').attr('title','Portfolio List');
                $('#search-header').remove();
                $('#search-error-text').remove();

                /*= SHOW THE LOADED ITEMS =*/
				$('#container-items').show();

                /*= SET THE ACCORDION TO SHOW THE WELCOME PANE/MESSAGE =*/
                set_accordion( acc_welcome_pane );

                $portfolio_items = $('#container-items article.item');
			});

            /*= WE'RE NOT VIEWING A PARTICULAR ITEM NOR ON THE SEARCH PAGE =*/
            onViewItemPage = onSearchPage = false;
    	}

        /*====  LOAD ONE PORTFOLIO ITEM BASED ON INDEX (PASSED AS DATA)  ====*/
        else if(action == 'item'){
            /*= SET ACCORDION TO SHOW HIDDEN PANE =*/
            set_accordion( acc_hidden_pane );

            $('#container-items').html(loading_text).load('/includes/pages/view.php', {id:data}, function(response, status, xhr){
                /*= RESETS =*/
                $header_links.removeClass('selected').hide();
                $search_form.removeClass('search-error').hide();
                $('#portfolio-link').removeClass('selected').attr('title','Return to Portfolio');
                $('#search-header').remove();

                /*= SHOW THE CONTENT =*/
                $('#container-items').show();

                if( $('#view-project').length > 0 ){
                    viewItemType = 'project';
                    $portfolio_sidebar = $('#view-project').children('section');
                    sidebar_offset = $portfolio_sidebar.offset();


                    //$portfolio_sidebar.jScrollPane({ 'showArrows': false, autoReinitialise: true });
                    //sidebar_api = $portfolio_sidebar.data('jsp');
                }

                /*= WE ARE VIEWING A PARTICULAR ITEM =*/
				onViewItemPage = true;
			});
    	}

        /*====  LIST PORTFOLIO ITEMS WHICH MATCHES QUERY (PASSED AS DATA)  ====*/
        else if(action == 'search'){
            var elems = [];
            /*= LOOP THORUGH EACH PORTFOLIO ITEM =*/
            $portfolio_items.each(function(index){
                var $this = $(this);

                /*= GET THE (DATA)TITLE & (DATA)TAGS - THEN SPLIT EACH TO AN ARRAY  =*/
                var data_title = $this.data('title');
                var data_tags = $this.data('tags');
                var title = (typeof data_title === 'undefined') ? null : data_title.toLowerCase().split(' ');
                var tags = (typeof data_tags === 'undefined') ? null : data_tags.toLowerCase().split(', ');

                /*= LOOP THROUGH THE QUERY ARRAY (REF. DATA) =*/
                $.each(data, function(index, value){
                    /*= IF VALUE IS FOUND IN TITLE/TAGS ADD THE ELEMENTS ID TO ARRAY ELEMS =*/
                    if( value.length >= 3 && (jQuery.inArray(value,title) != -1 || jQuery.inArray(value,tags) != -1) )
                        elems.push( '#' + $this.attr('id') );
                });
            });

            /*= RETURN THE LIST OF ELEMS WHICH HAVE A TITLE/TAG W/ THE SEARCH QUERY =*/
            return elems;
        }
    }

    
    
	
	
