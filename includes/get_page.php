<?
/*
	HTACCESS - MOD_REWRITE DEFINITIONS
	http://thalida.com/example/sub/1
	$page = example
	$filter = sub
	$num = 1
*/

$page = $_GET['page'];
$filter = $_GET['filter'];
$num = $_GET['num'];

switch($page){
	case '':
		$load_page='home.php';
	break;
	case 'demo':
		$load_page='demo.php';
	break;
	case 'projects':
		$load_page='projects.php';
	break;
	case 'thoughts':
		$load_page='thoughts.php';
	break;
	case 'about':
		$load_page='about.php';
	break;
	case 'comments':
		$load_page='comments_admin.php';
	break;
	case 'login':
		$load_page='login.php';
	break;
	case 'logout':
		$load_page='logout.php';
	break;
}
if($load_page == '') redirect('/');
?>
