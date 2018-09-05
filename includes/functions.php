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

function format_text($text) {
	$text = stripslashes($text);
	$bbcode = array(
        //Text Appearance
        '#\[b\](.*?)\[/b\]#si' => '<span class="font-medium">\\1</span>',
        '#\[i\](.*?)\[/i\]#si' => '<span class="font-light-italic">\\1</span>',
        '#\[header\](.*?)\[/header\]#si' => '<span class="text-header">\\1</span>',
		
        //Other
		'#\[mail](.*?)\[/mail]#si' => '<a href="mailto:\\1">\\1</a>',
		'#\[url](.*?)\[/url]#si' => '<a href="\\1" target="_blank">\\1</a>',
        '#\[url=(.*?)\](.*?)\[/url]#si' => '<a href="\\1" target="_blank">\\2</a>',
        '#\[turl="(.*?)"\](.*?)\[/turl]#si' => '<a href="\\1">\\2</a>',
        '#\[img\](.*?)\[/img\]#si' => '<img src="\\1">'
    );
	$text = preg_replace(array_keys($bbcode), array_values($bbcode), $text);
	$text = nl2br($text);
    return $text;
}

function format_date($date,$format){
	$date = date($format,$date);
	return $date;
}

?>