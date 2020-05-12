<?
date_default_timezone_set('America/New_York');
require('includes/database.php');
require('includes/functions.php');
?>
<!---------------------------------------------------------------------------------------
=========================================================================================
THALIDA.COM - VERSION 10
=========================================================================================
GENERAL INFO
    INITIAL UPLOAD   :	January 3, 2012
    LAST UPDATED    :	March 13, 2012
==========================================================================================
JQUERY PLUGINS USED:
    HISTORY.JS      :	https://github.com/balupton/History.js/
    JSCROLLPANE     :	http://jscrollpane.kelvinluck.com/
==========================================================================================
FONTS USED:
    ROBOTO          :   http://www.fontsquirrel.com/fonts/roboto
==========================================================================================
----------------------------------------------------------------------------------------->

<!--===== HTML5 ROCKS! =====-->
<!DOCTYPE HTML>
<html>
<head>
	<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
	<meta http-equiv="Content-Type" content="text/html" charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="description" content="This is the personal portfolio and website of Thalida Noel." />
	<meta name="keywords" content="thalida, noel, portfolio, work, projects, blog, thoughts, experiments" />
	<meta name="author" content="Thalida Noel" />

	<link rel="shortcut icon" href="/favicon.ico">
    <title>thalida</title>

	<!--===== STYLESHEETS =====-->
    <link href="/includes/css/resets.css" type="text/css" rel="stylesheet">
	<link href="/includes/css/fonts/font.css" type="text/css" rel="stylesheet" /> <!-- LOAD ROBOTO FONTS -->
	<link href="/includes/css/jquery.jscrollpane.css" type="text/css" rel="stylesheet" /> <!-- SCROLLBAR STYLES -->
	<link href="/includes/css/style.css" type="text/css" rel="stylesheet" media="screen" /> <!-- THALIDA.COM STYLES -->

    <!--===== REQUIRED SCRIPTS =====-->
    <script>document.cookie='resolution='+Math.max(screen.width,screen.height)+'; path=/';</script>
	<script src="/includes/js/css3-mediaqueries.js" type="text/javascript"></script> <!-- CSS3 MEDIA QUERIES SUPPORT -->
    <script src="//code.jquery.com/jquery-latest.js" type="text/javascript"></script> <!-- LATEST VERSION OF JQUERY -->
    <script src="//code.jquery.com/ui/1.9.2/jquery-ui.js"></script> <!-- JQUERY UI -->
</head>
<body>
	<noscript>
		<style>
			#loading-overlay{ display:none; }
			#wrapper{ display:none; }
			#no-script{ display:block; width:40%; margin:10% auto 0; padding:20px; background:rgba(255,89,89,0.9); border-radius:5px; overflow:hidden; }
			#title {display:block; padding:0; font:24px "RobotoRegular";  }
			p { font:16px "RobotoLight",sans-serif; padding:0; margin:20px 0 0 0; }
			a { display:block; float:left; margin:20px 5px 0px; padding:10px; background:#fff; border-radius:5px; color:#111; }
			a:hover { background:#111; color:#fff; }
		</style>
		<div id="no-script">
			<span id="title">JavaScript is Disabled!</span>
			<p>Either you have JavaScript disabled, in which case you may bookmark my site and vist it whenever JavaScript is renabled.</p>
			<p>Or, you are using a browser which does not support JavaScript, in this case I'd suggest one of the browsers linked below.</p>
			<p>I apologize for any inconvience this has caused, Thalida.</p>
			<a href="https://www.google.com/intl/en/chrome/browser/" target="_blank">Check out Google Chrome</a>
			<a href="https://www.mozilla.org/en-US/firefox/fx/#desktop" target="_blank">Check out Firefox</a>
			<a href="//windows.microsoft.com/en-US/internet-explorer/download-ie" target="_blank">Check out Internet Explorer 9</a>
		</div>
	</noscript>
	<!--===== WRAPPER USED TO ADD CUSTOM SCROLLBAR (WOOT! NO MORE UGLY SCROLLBARS!) =====-->
	<div id="wrapper">
		<header id="main-header">
			<a id="name-wrapper" href="/">
				<span id="header-name">thalida</span>
				<span id="header-job">web developer</span>
			</a>
			<nav>
				<ul>
					<? if($start == 1){ ?>
					<li><a href="/manage">Manage Site</a></li>
					<li><a href="/logout">Logout</a></li>
			    	<? } ?>
			    	<li><a id="portfolio-link" class="selected link-tooltip" title="Portfolio List"><span class="icon icon-portfolio"></span></a></li>
			    	<li>&nbsp;</li>
			    	<li><a id="about-link" class="header-link link-tooltip" title="About"><span class="icon icon-about"></span></a></li>
			    	<li><a id="contact-link" class="header-link link-tooltip" title="Contact"><span class="icon icon-contact"></span></a></li>
		    </ul>
	    		<form id="search-form" class="search-default">
	    			<input id="search-input" class="search-input-default" type="text" value="search">
					<button id="search-submit" type="submit"><span id="search-icon" class="icon icon-search"></span></button>
	    		</form>
			</nav>
		</header>

		<section id="accordion-container">&nbsp;</section>

		<section id="container-items"></section>
	</div>
	<div id="loading-overlay"><div><span>loading thalida.com</span><img src="/includes/images/loading.gif" width='32' height='32' /></div></div>
<!--===== SCRIPTS =====-->
<!--[if lt IE 9]><script type="text/javascript" src="/includes/js/excanvas.js"></script><![endif]--> <!-- ADD CANVAS SUPPORT TO IE -->
<script type="text/javascript" src="/includes/js/jquery.history.js"></script> <!-- HISTORY.JS -->
<script type="text/javascript" src="/includes/js/jquery.mousewheel.js"></script><!-- MOUSEWHEEL SUPPORT -->
<script type="text/javascript" src="/includes/js/jquery.jscrollpane.min.js"></script> <!-- JQUERY SCROLLPANE -->
<script type="text/javascript" src="/includes/js/init.js"></script> <!-- THALIDA.COM SCRITPS -->
</body>
</html>
