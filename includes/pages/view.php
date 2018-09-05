<?
session_start();
date_default_timezone_set('America/New_York');
require('../database.php');
require('../functions.php');
// require('../page_sessions.php');

$view_id = $_POST['id'] + 0;
// $popup_query = "SELECT * FROM `post` WHERE `id`='$view_id' AND `hidden`=0";
if (true) {
	// $popup_result = $mysqli->query($popup_query)
    // $row_cnt = $popup_result->num_rows;
	// while ($popup_row = $popup_result->fetch_object()){
		$this_type = 1;
		$this_title =" Lorem Ipsum #" . $view_id;
		$this_subtitle = "Dolor Something";
		$this_text = format_text("Cupcake ipsum dolor sit amet tootsie roll toffee bear claw. I love sugar plum biscuit jelly-o pastry sweet roll. I love biscuit sweet muffin lollipop. Halvah apple pie I love apple pie. Gummies jelly-o I love. Icing sugar plum cake jujubes ice cream bear claw fruitcake macaroon marzipan. Marshmallow apple pie I love croissant I love I love soufflé. Lollipop candy pie croissant. I love I love halvah I love sugar plum jujubes tiramisu. Cookie fruitcake oat cake icing gingerbread macaroon jujubes. Tiramisu bear claw carrot cake chocolate bar donut croissant biscuit carrot cake. Jelly beans sesame snaps halvah brownie I love lollipop.");
		$this_bg = $view_id.'_s.png;'.$view_id.'_1_lg.png;'.$view_id.'_2_lg.png';
		$this_bg_arr = preg_split("/[;]+/", $this_bg);
		// $this_date = format_date($popup_row->date,'d F Y');

		// was:
		// $this_type = $popup_row->type + 0;
		// $this_title = stripslashes($popup_row->title);
		// $this_subtitle = stripslashes($popup_row->subtitle);
		// $this_text = format_text($popup_row->text);
		// $this_bg = stripslashes($popup_row->images);
        // $this_bg_arr = preg_split("/[;]+/", $this_bg);
		// $this_date = format_date($popup_row->date,'d F Y');

        if( $this_type == 1){
            $this_images = '';
			foreach ($this_bg_arr as $key => $img) {
				if($key > 0){
                    $this_imgs_arr = preg_split("/[,]+/", $this_bg_arr[$key]);
                    $img = $this_imgs_arr[0];
                    $label = $this_imgs_arr[1];
                    $this_images .= '<div class="view-project-image"><img src="/includes/images/portfolio/' . $img . '" /></div><span>'. $label .'</span>';
                }
			}
		}

		if( $this_type == 1){
?>
			<div id="view-project">
				<section>
                    <div>
                        <header>
                            <!--<span class="date"><?=$this_date; ?></span>-->
                            <span class="title"><?=$this_title; ?></span>
                            <span class="subtitle"><?=$this_subtitle; ?></span>
                        </header>
                        <p><?=$this_text; ?></p>
                    </div>
				</section>

				<div id="view-project-image-wrapper"><?=$this_images; ?></div>
			</div>
<?
		}else if( $this_type == 2 || $this_type == 4 ){
?>
			<div id="view-article">
				<header>
					<!--<span class="date"><?=$this_date; ?></span>-->
					<span class="title"><?=$this_title; ?></span>
					<span class="subtitle"><?=$this_subtitle; ?></span>
				</header>
				<article class="post">
					<?=$this_text; ?>
				</article>
			</div>
<?
        }else if( $this_type == 3){
            $this_file = $this_bg_arr[1];
?>
			<div id="view-experiment">
                <div id="experiment"><? include('../demos/'.$this_file); ?></div>
				<header>
					<!--<span class="date"><?=$this_date; ?></span>-->
					<span class="title"><?=$this_title; ?></span>
					<span class="subtitle"><?=$this_subtitle; ?></span>
				</header>
			</div>
<?
		}
	// }//END WHILE
    if(false && $row_cnt == 0){
?>
        <div id="view-notfound">
            <header>
                <span id="title">Oh No! The page you've requested has not been found!</span>
                <span id="subtitle">You are going to be redirected to the homepage!</span>
            </header>
        </div>
<?
        redirect('/');
    }//END IF !FOUND
}
?>
