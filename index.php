<?
session_start();
require('includes/functions.php');
require('includes/session_variables.php');
require('includes/get_page.php');
?>
<!DOCTYPE HTML>
<html>
<head>
	<meta charset="UTF-8" />
    <meta name="description" content="This is the personal portfolio and website of Thalida Noel.  This site will be the home of her work (design &amp; development), and a collection of her thoughts and opinions." />
    <meta http-equiv="Cache-Control" content="public" />
    <meta name="keywords" content="thalida, noel, portfolio, work, projects, thoughts, html5" />
    <meta name="author" content="Thalida Noel" />
    <link rel="shortcut icon" href="/favicon.ico">
    <title>Thalida Noel</title>

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<!--[if lte IE 9]><link type="text/css" rel="stylesheet" href="/includes/css/ie.css" media="screen" /><![endif]-->
	<link rel="stylesheet" href="/includes/css/1140.css" type="text/css" media="screen" />
    <link type="text/css" rel="stylesheet" href="http://fonts.googleapis.com/css?family=Droid+Sans:400,700" />
    <link type="text/css" rel="stylesheet" href="/includes/css/style.css" media="screen" />

	<script type="text/javascript" src="http://code.jquery.com/jquery-latest.js"></script>
	<script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.9/jquery-ui.min.js" type="text/javascript"></script>
</head>
<body>

	<!--CONTAINER-->
    <div class="container">
    	<!--HEADER SECTION-->
        <div class="row header">
            <div class="threecol border-top">
                <h3>Who</h3>
                <p class="normal">Thalida Noel</p>
                <p class="sub">Designer / Developer / Student</p>
            </div>
            <div class="threecol border-top">
                <h3>Navigation</h3>
                <ul class="main-menu">
                	<li><a href="/">Home</a></li>
                    <li><a href="/projects">Projects</a></li>
                    <li><a href="/thoughts">Thoughts</a></li>
                    <li><a href="/about">About</a></li>
                </ul>
            </div>
            <div class="threecol">&nbsp;</div>
            <div class="threecol last border-top">
                <h3>Contact</h3>
                <p class="normal">hello@thalida.com</p>
                <p class="normal"><a href="https://twitter.com/#!/thalidanoel" target="_blank">@thalidanoel</a></p>
                <p class="normal">11301 Springfield Road Laurel MD 20708</p>
            </div>
        </div>
        <!--END HEADER SECTION-->

        <div class="spacer"></div>

        <? require('includes/pages/' . $load_page); ?>

        <div class="spacer"></div>

        <!--FOOTER SECTION-->
        <div class="row footer">
            <div class="ninecol border-top">
                <h3>&copy; Thalida Noel MMXII </h3>
            </div>
            <div class="threecol last border-top">
            	<h3>Quick Links</h3>
            	<ul class="main-menu">
                	<li><a href="/">Home</a></li>
                <? if($start){ ?>
                    <li><a href="/projects/add">Add Project</a></li>
                    <li><a href="/thoughts/add">Add Thought</a></li>
                    <li><a href="/logout">Logout</a></li>
                <? } else { ?>
                    <li><a href="/projects">Projects</a></li>
                    <li><a href="/thoughts">Thoughts</a></li>
                    <li><a href="/about">About</a></li>
				 <? }?>
                 </ul>
            </div>
        </div>
        <!--END FOOTER SECTION-->
    </div>
    <!--END CONTAINER-->

    <!--SCRIPTS-->
    <script type="text/javascript" src="/includes/js/css3-mediaqueries.js"></script>
    <script type="text/javascript" src="/includes/js/init.js"></script>
 	<script type="text/javascript">
	  var _gaq = _gaq || [];
	  _gaq.push(['_setAccount', 'UA-27471736-1']);
	  _gaq.push(['_setDomainName', 'thalida.com']);
	  _gaq.push(['_trackPageview']);

	  (function() {
		var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
		ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
		var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
	  })();

	</script>
</body>
</html>
