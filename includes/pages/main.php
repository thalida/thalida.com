<?
session_start();
date_default_timezone_set('America/New_York');
require('../database.php');
require('../functions.php');
// require('../page_sessions.php');

$query = "SELECT * FROM `post` WHERE `hidden`=0 ORDER BY position DESC";
$item_count = 0;
if (true) { // was: $result = $mysqli->query($query)
	$num_posts = 1;
	while ($num_posts <= 8){ // was: $row = $result->fetch_object()
		$this_id = $num_posts;
		$this_type = 1;
		$this_title = "Lorem Ipsum #" . $this_id;
		$this_subtitle = "Dolor Something";
		$this_tags = 'foo, bar, bat, cat';
		$this_bg = $this_id.'_s.png;'.$this_id.'_1_lg.png;'.$this_id.'_2_lg.png';
		$this_bg_arr = preg_split("/[;]+/", $this_bg);
		$item_count = $item_count + 1;

		// was:
		// $this_id = $row->id;
		// $this_type = $row->type + 0;
		// $this_title = $row->title;
		// $this_subtitle = $row->subtitle;
		// $this_tags = $row->tags;
		// $this_bg = $row->images;
		// $this_bg_arr = preg_split("/[;]+/", $this_bg);
		// $item_count = $item_count + 1;

		if( $this_type != 2){
			$this_sm_img = $this_bg_arr[0];
?>
			<article id="portfolio-item-<?=$item_count; ?>" class="item item-has-img" data-pk="<?=$this_id; ?>" data-title="<?=$this_title; ?>" data-tags="<?=$this_tags; ?>">
				<a href="#">
					<div class="item-default">
						<img src="/includes/images/portfolio/<?=$this_sm_img; ?>" width="400" height="400" />
					</div>
					<div class="item-hover">
						<div class="item-hover-inner">
							<span class="item-hover-header"><?=$this_title; ?></span>
							<span class="item-hover-sub-header"><?=$this_subtitle; ?></span>
							<span class="icon icon-view"></span>
						</div>
					</div>
				</a>
			</article>
<?		}else{
			$this_color1 = $this_bg_arr[0];
			$this_color2 = $this_bg_arr[1];

?>
			<article id="portfolio-item-<?=$item_count; ?>" class="item" data-pk="<?=$this_id; ?>" data-title="<?=$this_title?>" data-tags="<?=$this_tags; ?>">
				<a href="#">
					<style>
					.gradient_1{
							background-color: <?=$this_color1; ?>;
							background: -webkit-gradient(radial, center center, 0, center center, 400, from(<?=$this_color1; ?>), to(<?=$this_color2; ?>));
							background: -webkit-radial-gradient(circle, <?=$this_color1; ?>, <?=$this_color2; ?>);
							background: -moz-radial-gradient(circle, <?=$this_color1; ?>, <?=$this_color2; ?>);
							background: -ms-radial-gradient(circle, <?=$this_color1; ?>, <?=$this_color2; ?>);
					}
					</style>
					<div class="item-default gradient_1">
						<div class="item-blog-wrapper">
							<span class="item-header"><?=$this_title; ?></span>
							<span class="item-sub-header">a blog post</span>
						</div>
					</div>
					<div class="item-hover">
						<div class="item-hover-inner">
							<span class="item-hover-header"><?=$this_title; ?></span>
							<span class="item-hover-sub-header"><?=$this_subtitle; ?></span>
							<span class="icon icon-view"></span>
						</div>
					</div>
				</a>
			</article>
<? 		}/*END IF TYPE*/

		$num_posts += 1;
	}/*END WHILE*/
}/*END IF RESULTS*/
?>

<script type="text/javascript">
    total_items = <?=$item_count; ?>;
</script>
