<?
function redirect($location){
	?>
	<script type="text/javascript">
        <!--
        top.location = "<?=$location; ?>"
        -->
    </script>
    <?	
}
function get_thought_type($a){
	if($a  == 1) $b = "Design Post";
	else if($a  == 2) $b = "Development Post";
	else if($a  == 3) $b = "Robotics Post";
	else if($a  == 4) $b = "Rant";
	else if($a  == 5) $b = "Journal";
	else $b = "Miscellaneous Post";
	
	return $b;
}

function get_project_type($a){
	if($a == 1) $b = "Personal Project";
	else if($a == 2) $b = "Commissioned";
	else if($a == 3) $b = "School Project";
	else $b = "Miscellaneous";
	
	return $b;
}

function get_project_medium($a){
	if($a == 1) $b = "Website";
	else if($a == 2) $b = "Program";
	else if($a == 3) $b = "Illustration";
	else if($a == 4) $b = "Logo";
	else if($a == 5) $b = "Robot";
	else if($a == 6) $b = "HTML5";
	else $b = "Miscellaneous";
	
	return $b;
}

function get_project_status($a){
	if($a == 1) $b = "In Development";
	else if($a == 2) $b = "In Development - On Hold";
	else if($a == 3) $b = "Completed";
	else $b = "No Status";
	
	return $b;
}

function format_text($text) { 
  	$text = stripslashes($text);
    return $text;
}//format_text()

function format_long_text($text) { 
	$text = nl2br($text);
	$text = stripslashes($text);
	$bbcode = array(
        //Text Apperence
        '#\[b\](.*?)\[/b\]#si' => '<span style="font-weight:bold;">\\1</span>',
        '#\[i\](.*?)\[/i\]#si' => '<i>\\1</i>',
        '#\[u\](.*?)\[/u\]#si' => '<u>\\1</u>',
        '#\[h1\](.*?)\[/h1\]#si' => '<span class="h1">\\1</span>',
        '#\[h2\](.*?)\[/h2\]#si' => '<span class="h2">\\1</span>',
		
        //Other
		'#\[url](.*?)\[/url]#si' => '<a href="\\1" target="_blank">\\1</a>',
        '#\[url=(.*?)\](.*?)\[/url]#si' => '<a href="\\1" target="_blank">\\2</a>',
        '#\[turl=(.*?)\](.*?)\[/turl]#si' => '<a href="\\1">\\2</a>',
        '#\[img\](.*?)\[/img\]#si' => '<img src="\\1">'
    );
	$text = preg_replace(array_keys($bbcode), array_values($bbcode), $text);
    return $text;
}//format_text()

function mysql_format($text){
	$text = addslashes($text);
	return $text;
}

function remove_tags($text) { 
    $tags = array(
        //Text Apperence
        '#\<a(.*?)>(.*?)</a>#si' => '\\2',
		'#<b>(.*?)</b>#si' => '\\1',
		'#<i>(.*?)</i>#si' => '\\1',
		'#<u>(.*?)</u>#si' => '\\1',
        '#\[b\](.*?)\[/b\]#si' => '\\1',
        '#\[i\](.*?)\[/i\]#si' => '\\1',
        '#\[u\](.*?)\[/u\]#si' => '\\1',
        '#\[s\](.*?)\[/s\]#si' => '\\1',
        //Other
		'#\[url](.*?)\[/url]#si' => '\\1',
        '#\[url=(.*?)\](.*?)\[/url]#si' => '\\2',
        '#\[turl=(.*?)\](.*?)\[/turl]#si' => '\\2',
        '#\[img\](.*?)\[/img\]#si' => '(image: \\1)',
		//Saftey
		'#<#si' => '&lt;',
		'#>#si' => '&gt;',
		'#&#si' => '&amp;'
    );
	
	$text = preg_replace(array_keys($tags), array_values($tags), $text);
    return $text;
}//remove_format()

function format_date($date){
	$newDate = date("m.d.Y",$date);
	return $newDate;
}//format_date()

function format_datetime($date){
	$newDate = date("m.d.Y @ h:i:s A T",$date);
	return $newDate;
}//format_date()

?>