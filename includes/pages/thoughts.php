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
	$gt_row = 5;
	$gt_i = 1;
	while($gt_i < $gt_row){
		$gt_id = $gt_i;
		$gt_title = "Lorem Ipsum";
		$gt_subtitle = "I love biscuit sweet muffin lollipop. Halvah apple pie I love apple pie. Gummies jelly-o I love. Icing sugar plum cake jujubes ice cream bear claw fruitcake macaroon marzipan. Marshmallow apple pie I love croissant I love I love soufflé. Lollipop candy pie croissant.";
		$gt_type = get_thought_type($gt_id % 5);
		$gt_text = format_text(substr(remove_tags("
Cupcake ipsum dolor sit amet muffin. Pie lollipop cookie. Tiramisu marshmallow soufflé candy. Wafer cupcake cheesecake ice cream jelly dragée candy sweet roll. Donut danish cookie lollipop cupcake. Sweet chupa chups I love toffee icing marshmallow carrot cake cupcake fruitcake. Gummi bears halvah chocolate cake candy canes tiramisu jujubes wafer I love apple pie. Fruitcake tiramisu ice cream caramels. Ice cream tiramisu jelly beans. Gummi bears I love icing chupa chups sugar plum. Tiramisu candy canes jelly beans chocolate cake wafer I love liquorice. I love I love cookie biscuit chupa chups jelly-o I love icing. Gummi bears chocolate cake sweet roll I love.

Candy canes I love jujubes. Lemon drops I love apple pie jujubes apple pie. Cotton candy cake I love I love. Lemon drops tootsie roll macaroon oat cake pie fruitcake. Dragée bear claw I love gingerbread fruitcake muffin sweet. Tiramisu cheesecake soufflé pastry. Soufflé bear claw pie chocolate fruitcake biscuit dessert powder. I love gummi bears muffin dessert lollipop I love. Jelly-o I love tiramisu soufflé cake. Marshmallow cotton candy halvah dragée I love dragée carrot cake bear claw. Bear claw soufflé ice cream. Lollipop icing gummies. Apple pie wafer wafer croissant chocolate cake lollipop. Powder tootsie roll cake marshmallow chocolate dessert danish jelly beans chocolate bar.

Marshmallow cotton candy liquorice cookie powder toffee caramels I love tiramisu. Brownie fruitcake cake. I love halvah chocolate. Cake cookie tootsie roll I love I love I love dessert. Lemon drops lemon drops apple pie candy canes jelly-o gummies. Fruitcake tiramisu croissant caramels candy canes jelly-o. Chocolate brownie icing I love jelly candy canes toffee brownie oat cake. Cupcake marshmallow pie ice cream jelly beans ice cream candy canes cupcake cheesecake. Macaroon apple pie danish powder pudding. I love brownie lemon drops I love tiramisu. Dessert jelly beans topping pie I love chupa chups. Macaroon cake macaroon I love.

Marzipan jelly chocolate cake danish bear claw. Jujubes gummies sweet gummies cookie. I love cake cake marzipan bear claw. Cheesecake jujubes jelly-o. I love pie tiramisu pudding. Pastry carrot cake cake dragée. Sweet cake croissant. Biscuit chupa chups wafer I love lollipop tiramisu lemon drops chocolate cake bear claw. Apple pie caramels soufflé. Caramels cake dragée dragée jujubes brownie oat cake dragée. Pudding dragée gummies liquorice. I love cotton candy dessert macaroon.

Toffee I love cupcake I love macaroon soufflé donut. Wafer chocolate bar I love I love gingerbread bonbon ice cream halvah tootsie roll. Pudding halvah I love lemon drops I love carrot cake cotton candy dragée pastry. Apple pie soufflé marshmallow croissant. Icing wafer marshmallow muffin. Sesame snaps cheesecake cotton candy pastry cotton candy gingerbread. Candy sesame snaps bonbon halvah candy I love candy sesame snaps. Sesame snaps cake cheesecake. Lollipop powder tiramisu icing croissant. Cotton candy marzipan muffin. Cookie candy chocolate gingerbread sugar plum dragée chupa chups donut I love. Tootsie roll lollipop bonbon. Marshmallow sweet roll cake bear claw icing lemon drops."), 0, 120)) . '...';
		// $gt_date = format_date(mysql_result($gt_result,$gt_i,"date"));
		// $gt_comment_query=mysql_query("SELECT * FROM comments WHERE post_id='$gt_id' ORDER BY date DESC");
		$gt_comments_count = 10;

	// 	was:
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
		$gt_i ++;
	}
	// if($gt_row == 0) redirect("/");

} else if($filter == 'view' && $num != ''){
	// $vt_query = "SELECT * FROM post WHERE id='$num'";
	// $vt_result = mysql_query($vt_query);
	// $vt_row = mysql_num_rows($vt_result);
  //
	// if($vt_row == 0) redirect("/thoughts");

  $vt_id = $num;
  $vt_title = "Lorem Ipsum";
  $vt_subtitle = "I love biscuit sweet muffin lollipop. Halvah apple pie I love apple pie. Gummies jelly-o I love. Icing sugar plum cake jujubes ice cream bear claw fruitcake macaroon marzipan. Marshmallow apple pie I love croissant I love I love soufflé. Lollipop candy pie croissant.";
	$vt_type = get_thought_type($num % 5);
	$vt_text = format_long_text("Cupcake ipsum dolor sit amet muffin. Pie lollipop cookie. Tiramisu marshmallow soufflé candy. Wafer cupcake cheesecake ice cream jelly dragée candy sweet roll. Donut danish cookie lollipop cupcake. Sweet chupa chups I love toffee icing marshmallow carrot cake cupcake fruitcake. Gummi bears halvah chocolate cake candy canes tiramisu jujubes wafer I love apple pie. Fruitcake tiramisu ice cream caramels. Ice cream tiramisu jelly beans. Gummi bears I love icing chupa chups sugar plum. Tiramisu candy canes jelly beans chocolate cake wafer I love liquorice. I love I love cookie biscuit chupa chups jelly-o I love icing. Gummi bears chocolate cake sweet roll I love.

  Candy canes I love jujubes. Lemon drops I love apple pie jujubes apple pie. Cotton candy cake I love I love. Lemon drops tootsie roll macaroon oat cake pie fruitcake. Dragée bear claw I love gingerbread fruitcake muffin sweet. Tiramisu cheesecake soufflé pastry. Soufflé bear claw pie chocolate fruitcake biscuit dessert powder. I love gummi bears muffin dessert lollipop I love. Jelly-o I love tiramisu soufflé cake. Marshmallow cotton candy halvah dragée I love dragée carrot cake bear claw. Bear claw soufflé ice cream. Lollipop icing gummies. Apple pie wafer wafer croissant chocolate cake lollipop. Powder tootsie roll cake marshmallow chocolate dessert danish jelly beans chocolate bar.

  Marshmallow cotton candy liquorice cookie powder toffee caramels I love tiramisu. Brownie fruitcake cake. I love halvah chocolate. Cake cookie tootsie roll I love I love I love dessert. Lemon drops lemon drops apple pie candy canes jelly-o gummies. Fruitcake tiramisu croissant caramels candy canes jelly-o. Chocolate brownie icing I love jelly candy canes toffee brownie oat cake. Cupcake marshmallow pie ice cream jelly beans ice cream candy canes cupcake cheesecake. Macaroon apple pie danish powder pudding. I love brownie lemon drops I love tiramisu. Dessert jelly beans topping pie I love chupa chups. Macaroon cake macaroon I love.

  Marzipan jelly chocolate cake danish bear claw. Jujubes gummies sweet gummies cookie. I love cake cake marzipan bear claw. Cheesecake jujubes jelly-o. I love pie tiramisu pudding. Pastry carrot cake cake dragée. Sweet cake croissant. Biscuit chupa chups wafer I love lollipop tiramisu lemon drops chocolate cake bear claw. Apple pie caramels soufflé. Caramels cake dragée dragée jujubes brownie oat cake dragée. Pudding dragée gummies liquorice. I love cotton candy dessert macaroon.

  Toffee I love cupcake I love macaroon soufflé donut. Wafer chocolate bar I love I love gingerbread bonbon ice cream halvah tootsie roll. Pudding halvah I love lemon drops I love carrot cake cotton candy dragée pastry. Apple pie soufflé marshmallow croissant. Icing wafer marshmallow muffin. Sesame snaps cheesecake cotton candy pastry cotton candy gingerbread. Candy sesame snaps bonbon halvah candy I love candy sesame snaps. Sesame snaps cake cheesecake. Lollipop powder tiramisu icing croissant. Cotton candy marzipan muffin. Cookie candy chocolate gingerbread sugar plum dragée chupa chups donut I love. Tootsie roll lollipop bonbon. Marshmallow sweet roll cake bear claw icing lemon drops.
");
	$vt_comments_count = 10;

  // was:
	// $vt_id = mysql_result($vt_result,0,"id");
	// $vt_title = mysql_result($vt_result,0,"title");
	// $vt_subtitle = mysql_result($vt_result,0,"subtitle");
	// $vt_type = get_thought_type(mysql_result($vt_result,0,"type"));
	// $vt_text = format_long_text(mysql_result($vt_result,0,"text"));
	// $vt_date = format_date(mysql_result($vt_result,0,"date"));
	// $vt_edit = mysql_result($vt_result,0,"edit");
	// if($vt_edit == 1) $vt_edited = format_datetime(mysql_result($vt_result,0,"edited"));
	// $vt_comment_query=mysql_query("SELECT * FROM comments WHERE post_id='$vt_id' && post_section='$page'");
	// $vt_comments_count=mysql_num_rows($vt_comment_query);
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
    <?
    // include_once('includes/pages/comments.php');
    ?>
    <!--END COMMENTS-->
<?
} else if($filter == 'add' && $start){
	include_once('includes/pages/thought_pages/new_thought.php');
} else if($filter == 'edit' && $num != '' && $start){
	include_once('includes/pages/thought_pages/edit_thought.php');
} else { redirect("/"); }
?>
<!--END THOUGHTS AREA-->
