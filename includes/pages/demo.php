<!--PROJECTS AREA-->
<?
if($filter == 'html5' && $num == '1'){
?>
	<!--VIEW PROJECT AREA-->
    <script type="text/javascript" src="/includes/js/demos/background.js"></script>
    <div class="row">
        <div class="twelvecol last">
            <h1><a href="/projects">/Projects</a> /HTML5 Project Demo</h1>
        </div>
    </div>
    <div class="row">
        <div id="demo_wrapper" class="twelvecol last border-top demo">
            <canvas id="interactiveDots" width="500" height="500">Your browser does not support the canvas property.</canvas>
        </div>
    </div>
    <!--END VIEW PROJECT-->
<?	
} else { redirect("/"); } ?>
<!--END PROJECTS AREA-->




