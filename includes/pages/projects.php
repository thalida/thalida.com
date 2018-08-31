<!--PROJECTS AREA-->
<?
$page = $_GET['page'];
$filter = $_GET['filter'];
$num = $_GET['num'];


if($filter == ''){
	/**************************************
	 **************************************
	 *
	 *     LIST PROJECTS FROM DATABASE
	 *
	 **************************************
	 **************************************/

	?>
    <div class="row">
        <div class="twelvecol last">
            <h1>/Projects</h1>
        </div>
    </div>
    <?
	// $gp_query = "SELECT * FROM folio ORDER BY id DESC";
	// $gp_result = mysql_query($gp_query);
	// $gp_row = mysql_num_rows($gp_result);
	// $gp_i = 0;
	// while($gp_i < $gp_row){
	// 	$gp_id = mysql_result($gp_result,$gp_i,"id");
	// 	$gp_title = mysql_result($gp_result,$gp_i,"title");
	// 	$gp_type = get_project_type(mysql_result($gp_result,$gp_i,"type"));
	// 	$gp_medium = get_project_medium(mysql_result($gp_result,$gp_i,"medium"));
	// 	$gp_status = get_project_status(mysql_result($gp_result,$gp_i,"status"));
	// 	$gp_text = format_text(substr(remove_tags(mysql_result($gp_result,$gp_i,"text")), 0, 120)) . '...';
	// 	$gp_tools = mysql_result($gp_result,$gp_i,"tools");
	// 	$gp_date = format_date(mysql_result($gp_result,$gp_i,"date"));
	//
    ?>
        <!--PROJECT LISTING-->
         <div class="row">
            <div class="sixcol border-top">
                <h3>Preview</h3>
                <a href="/projects/view/<?=$gp_id; ?>"><img src="/includes/images/portfolio/<?=$gp_id; ?>_sm.png" width="540" height="180" alt="Project <?=$gp_id; ?>"></a>
            </div>
            <div class="threecol border-top">
                <h3><?=$gp_medium; ?></h3>
                <h2><a href="/projects/view/<?=$gp_id; ?>"><?=$gp_title; ?></a></h2>
                <p class="sub"><?=$gp_date; ?></p>
                <p class="sub"><?=$gp_medium; ?></p>
                <p class="sub"><?=$gp_type; ?></p>
                <p class="sub"><?=$gp_status; ?></p>
            </div>
            <div class="threecol last border-top">
                <h3>Description</h3>
                <p class="normal"><?=$gp_text; ?></p>
                <p class="sub"><?=$gp_tools; ?></p>
            </div>
        </div>
        <!--END PROJECT LISTING-->
        <?
	// 	$gp_i ++;
	// }
	// if($gp_row == 0) redirect("/");

} else if($filter == 'view' && $num != ''){

/**************************************
 **************************************
 *
 *           VIEW PROJECT
 *
 **************************************
 **************************************/

	$vp_query = "SELECT * FROM folio WHERE id='$num'";
	$vp_result = mysql_query($vp_query);
	$vp_row = mysql_num_rows($vp_result);

	if($vp_row == 0) redirect("/projects");

	$vp_id = mysql_result($vp_result,0,"id");
	$vp_title = mysql_result($vp_result,0,"title");
	$vp_type = get_project_type(mysql_result($vp_result,0,"type"));
	$vp_medium_num = mysql_result($vp_result,0,"medium");
	$vp_medium = get_project_medium(mysql_result($vp_result,0,"medium"));
	$vp_status = get_project_status(mysql_result($vp_result,0,"status"));
	$vp_text = format_long_text(mysql_result($vp_result,0,"text"));
	$vp_tools = mysql_result($vp_result,0,"tools");
	$vp_file = mysql_result($vp_result,0,"file");
	$vp_date = format_date(mysql_result($vp_result,0,"date"));
	$vp_comment_query=mysql_query("SELECT * FROM comments WHERE post_id='$vp_id' && post_section='$page'");
	$vp_comments_count=mysql_num_rows($vp_comment_query);
	?>
    <!--VIEW PROJECT AREA-->
    <div class="row">
        <div class="twelvecol last">
            <h1><a href="/projects">/Projects</a> /<?=$vp_title; ?></h1>
        </div>
    </div>
    <div class="row">
    	<? if($vp_medium_num == 6){ ?>
        <script type="text/javascript" src="/includes/js/demos/<?=$vp_file; ?>"></script>
        <div class="ninecol border-top">
            <h3><?=$vp_medium; ?></h3>
            <div id="demo_wrapper">
        		<? if($vp_id == 7) { ?>
           		<canvas id="interactiveDots" width="500" height="500">Your browser does not support the canvas property.</canvas>
                <? } ?>
            </div>
        </div>
        <? } else{ ?>
		<div class="ninecol border-top">
            <h3><?=$vp_medium; ?></h3>
            <img src="/includes/images/portfolio/<?=$vp_id; ?>_lg.png" alt="Project <?=$vp_id; ?>">
        </div>
		<? } ?>
        <div class="threecol last border-top">
            <h3>Description</h3>
            <h2><?=$vp_title; ?></h2>
            <p class="sub"><?=$vp_date; ?></p>
            <p class="sub"><?=$vp_medium; ?></p>
            <p class="sub"><?=$vp_type; ?></p>
            <p class="sub"><?=$vp_status; ?></p>
            <p class="sub">
			<? if($start){ ?> <a href="/projects/edit/<?=$vp_id; ?>">Edit</a> <? } ?>
			</p><br />
            <p class="normal"><?=$vp_text; ?></p>
            <p class="sub"><?=$vp_tools; ?></p>
        </div>
    </div>
    <!--END VIEW PROJECT-->

<?
} else if($filter == 'add'){
	include_once('includes/pages/project_pages/new_project.php');
} else if($filter == 'edit' && $num != '' && $start){
	include_once('includes/pages/project_pages/edit_project.php');
} else { redirect("/"); }
?>
<!--END PROJECTS AREA-->
