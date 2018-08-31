 <!--THOUGHTS AREA-->
<?
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
            <h1>/Thoughts</h1>
        </div>
    </div>
    <?
	// $gt_query = "SELECT * FROM post ORDER BY id DESC";
	// $gt_result = mysql_query($gt_query);
	// $gt_row = mysql_num_rows($gt_result);
	// $gt_i = 0;
	// while($gt_i < $gt_row){
	// 	$gt_id = mysql_result($gt_result,$gt_i,"id");
	// 	$gt_title = mysql_result($gt_result,$gt_i,"title");
	// 	$gt_subtitle = mysql_result($gt_result,$gt_i,"subtitle");
	// 	$gt_type = get_thought_type(mysql_result($gt_result,$gt_i,"type"));
	// 	$gt_text = format_text(substr(remove_tags(mysql_result($gt_result,$gt_i,"text")), 0, 120)) . '...';
	// 	$gt_date = format_date(mysql_result($gt_result,$gt_i,"date"));
	// 	$gt_comment_query=mysql_query("SELECT * FROM comments WHERE post_id='$gt_id' ORDER BY date DESC");
	// 	$gt_comments_count=mysql_num_rows($gt_comment_query);
		?>
        <!--THOUGHT LISTING-->
        <div class="row">
            <div class="sixcol border-top">
                <h3><?=$gt_type; ?> On</h3>
                <h2><a href="/thoughts/view/<?=$gt_id; ?>"><?=$gt_title; ?></a></h2>
                <p class="normal"><?=$gt_subtitle; ?></p>
            </div>
            <div class="threecol border-top">
                <h3>Info</h3>
                <p class="normal"><?=$gt_type; ?></p>
                <p class="sub">Posted <?=$gt_date; ?></p>
                <p class="sub"><?=$gt_comments_count; ?> Comments</p>
            </div>
            <div class="threecol last border-top">
                <h3>Excerpt</h3>
                <p class="normal"><?=$gt_text; ?></p>
            </div>
        </div>
        <!--END THOUGHT LISTING-->

        <?
	// 	$gt_i ++;
	// }
	// if($gt_row == 0) redirect("/");

} else if($filter == 'view' && $num != ''){
	$vt_query = "SELECT * FROM post WHERE id='$num'";
	$vt_result = mysql_query($vt_query);
	$vt_row = mysql_num_rows($vt_result);

	if($vt_row == 0) redirect("/thoughts");

	$vt_id = mysql_result($vt_result,0,"id");
	$vt_title = mysql_result($vt_result,0,"title");
	$vt_subtitle = mysql_result($vt_result,0,"subtitle");
	$vt_type = get_thought_type(mysql_result($vt_result,0,"type"));
	$vt_text = format_long_text(mysql_result($vt_result,0,"text"));
	$vt_date = format_date(mysql_result($vt_result,0,"date"));
	$vt_edit = mysql_result($vt_result,0,"edit");
	if($vt_edit == 1) $vt_edited = format_datetime(mysql_result($vt_result,0,"edited"));
	$vt_comment_query=mysql_query("SELECT * FROM comments WHERE post_id='$vt_id' && post_section='$page'");
	$vt_comments_count=mysql_num_rows($vt_comment_query);
	?>
    <!--VIEW THOUGHT-->
    <div class="row">
        <div class="twelvecol last">
            <h1><a href="/thoughts">/Thoughts</a> /<?=$vt_title; ?></h1>
        </div>
    </div>
    <div class="row">
        <div class="threecol border-top">
            <h3><?=$vt_type; ?> On</h3>
            <h2><?=$vt_title; ?></h2>
            <p class="normal"><?=$vt_subtitle; ?></p><br />
            <p class="sub">Posted <?=$vt_date; ?></p>
            <? if($vt_edit == 1){ ?> <p class="sub">Edited <?=$vt_edited; ?></p> <? } ?>
            <p class="sub"><?=$vt_comments_count; ?> Comments</p>
            <p class="sub">
			<? if($start){ ?> <a href="/thoughts/edit/<?=$vt_id; ?>">Edit</a> <? } ?>
			</p>
        </div>
        <div class="sixcol last border-top">
        	<h3></h3>
            <p class="normal-long"><?=$vt_text; ?></p>
        </div>
    </div>
    <!--END VIEW THOUGHT-->

    <!--COMMENTS-->
    <div class="row">
        <div class="threecol">&nbsp;</div>
        <div class="sixcol last border-top">
            <h3><?=$vt_comments_count; ?> Comments</h3>
        </div>
    </div>
    <? include_once('includes/pages/comments.php'); ?>
    <!--END COMMENTS-->
<?
} else if($filter == 'add' && $start){
	include_once('includes/pages/thought_pages/new_thought.php');
} else if($filter == 'edit' && $num != '' && $start){
	include_once('includes/pages/thought_pages/edit_thought.php');
} else { redirect("/"); }
?>
<!--END THOUGHTS AREA-->
