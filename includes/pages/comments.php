<?
$gc_query = "SELECT * FROM comments WHERE post_id='$num' AND post_section='$page' ORDER BY date DESC";
$gc_result = mysql_query($gc_query);
$gc_row = mysql_num_rows($gc_result);
$gc_i = 0;
?>
<a id="comments"></a>
<?
while($gc_i < $gc_row){
	$comment_id = mysql_result($gc_result,$gc_i,"id");
	$comment_name = mysql_result($gc_result,$gc_i,"poster");
	$comment_text = format_long_text(mysql_result($gc_result,$gc_i,"text"));
	$comment_date = format_datetime(mysql_result($gc_result,$gc_i,"date"));
	?>
    <div class="row">
        <div class="threecol">&nbsp;</div>
        <div class="sixcol">
            <h3><?=$comment_name; ?> wrote: </h3>
        	<p class="normal"><?=$comment_text; ?></p>
            <p class="sub">Posted On <?=$comment_date; ?></p>
            <? if($start){ ?> <a href="/comments/delete/<?=$comment_id; ?>">remove comment</a> <? } ?>
        </div>
    </div>
    
    <div class="spacer"></div>
     
    <div class="row">
        <div class="threecol">&nbsp;</div>
        <div class="sixcol last border-top">&nbsp;</div>
    </div>
    <?
$gc_i ++;
}

if (isset($_POST['submit_comment'])){
	$submit_comment_name = $_POST['comment_name'];
	$submit_comment_text = $_POST['comment_text'];
	$submit_comment_robot = $_POST['comment_robot'] + 0;
	$error = 0;
	$response = '';
	if($submit_comment_robot != 5){
		$error = 1;
		$response = 'You entered the wrong solution! 3 + 2 != ' . $submit_comment_robot;
	}
	if(!preg_match("/[A-Za-z0-9 ]$/", $submit_comment_name) || $submit_comment_name == '' || strlen($submit_comment_name) > 16 || strlen($submit_comment_name) < 3 ){
		$error = 1;
		$response = 'Only 3-16 alphanumeric characters allowed.<br />';
	}
	if($submit_comment_text == ''){
		$error = 1;
		$response .= 'Comment Required.<br />';
	}
	if($error == 0){
		$date = time();
		$submit_comment_text = remove_tags($submit_comment_text);
		$submit_comment_text = mysql_format($submit_comment_text);
		mysql_query("INSERT INTO comments (`post_id`, `post_section`, `poster`, `text`, `date`) VALUES ('$num', '$page', '$submit_comment_name', '$submit_comment_text', '$date')") or die(mysql_error());
		
		$submit_comment_text = nl2br($submit_comment_text);
		$date = format_datetime($date);
		$to  = 'hello@thalida.com';
		$subject = 'New Website Comment';
		$message = '
			<html>
			<head>
			  <title>New Website Comment</title>
			</head>
			<body>
				Comment posted in '.$page.' section (<a href="http://thalida.com/'.$page.'/'.$filter.'/'.$num.'">link</a>) on '.$date.'.
			</body>
			</html>
		';
		$headers  = 'MIME-Version: 1.0' . "\r\n";
		$headers .= 'Content-type: text/html; charset=iso-8859-1' . "\r\n";
		mail($to, $subject, $message, $headers);
		
		redirect('/' . $page . '/' . $filter . '/' . $num);
	}else{
		redirect('#submit_comment');	
	}
}// END SUBMIT COMMENT

?>
<a id="submit_comment"></a>
<div class="row">
    <div class="threecol">&nbsp;</div>
    <div class="sixcol last">
    	<p class="form-error"><?=$response; ?></p>
        <form id="new_comment_form" method="post"  action="<? $_SERVER['PHP_SELF']; ?>" autocomplete="off" >
            <p class="normal">
            	<h3>Name</h3>
                <input type="text" id="comment_name" name="comment_name" class="form-input" size="135" value="<?=$submit_comment_name; ?>"/>
                <p id="form-name-error" class="form-error"></p>
            </p>
            <p class="normal">
            	<h3>Comment</h3>
                <textarea id="comment_text" name="comment_text" class="form-input" rows="5" cols="133"><?=$submit_comment_text; ?></textarea>
            	<p id="form-comment-error" class="form-error"></p>
            </p>
            <p class="normal">
            	<h3>Robot Check! 3 + 2 = </h3>
            	<input type="text" id="comment_robot" name="comment_robot" class="form-input" size="135" value="<?=$submit_comment_robot; ?>"/>
            	<p id="form-robot-error" class="form-error"></p>
            </p>
            <p class="normal">
                <input type="submit" id="submit_comment" name="submit_comment" class="form-submit" value="Post Comment" />
            </p>
        </form>
    </div>
</div>