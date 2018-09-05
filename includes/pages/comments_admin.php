<?
if($filter == 'delete' && $num != '' && $start){
	$dc_query = "SELECT * FROM comments WHERE id='$num'";
	$dc_result = mysql_query($dc_query);
	$dc_row = mysql_num_rows($dc_result);
	if($dc_row == 0) redirect('/');
	$del_comment_postid = mysql_result($dc_result,0,"post_id");
	$del_comment_section = mysql_result($dc_result,0,"post_section");
	
	mysql_query("DELETE FROM comments WHERE id='$num'") or die(mysql_error());
	
	redirect('/'.$del_comment_section.'/view/'.$del_comment_postid);
}else{
	redirect('/');	
}
?>