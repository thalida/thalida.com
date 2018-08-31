<?php
date_default_timezone_set('America/New_York');
if (empty($_SESSION['start'])){
	$start= '0';
	$_SESSION['start'] = '0';
}
elseif ($_SESSION['start'] == 1){
	$start = $_SESSION['start'];
	
	if (!empty($_SESSION['id'])){
		$usr_id = $_SESSION['id'];
	}
}
?>