<?
// $ft_query="SELECT * FROM post ORDER BY id DESC";
// $ft_result=mysql_query($ft_query);
// $ft_id = mysql_result($ft_result,0,"id");
// $ft_title = mysql_result($ft_result,0,"title");
// $ft_subtitle = mysql_result($ft_result,0,"subtitle");
// $ft_type = get_thought_type(mysql_result($ft_result,0,"type"));
// $ft_date = format_date(mysql_result($ft_result,0,"date"));
// $ft_text = format_text(substr(remove_tags(mysql_result($ft_result,0,"text")), 0, 120)) . '...';
// $ft_comment_query=mysql_query("SELECT * FROM comments WHERE post_id='$ft_id' ORDER BY date DESC");
// $ft_comments_count=mysql_num_rows($ft_comment_query);
//
// $fp_query="SELECT * FROM folio ORDER BY id DESC";
// $fp_result=mysql_query($fp_query);
// $fp_id = mysql_result($fp_result,0,"id");
// $fp_title = mysql_result($fp_result,0,"title");
// $fp_type = get_project_type(mysql_result($fp_result,0,"type"));
// $fp_medium = get_project_medium(mysql_result($fp_result,0,"medium"));
// $fp_status = get_project_status(mysql_result($fp_result,0,"status"));
// $fp_text = format_text(substr(remove_tags(mysql_result($fp_result,0,"text")), 0, 120)) . '...';
// $fp_tools = mysql_result($fp_result,0,"tools");
// $fp_date = format_date(mysql_result($fp_result,0,"date"));
?>
<!--WELCOME AREA & RECENT TWEET-->
<div class="row">
    <div class="sixcol border-top">
        <h3>Welcome</h3>
        <p class="normal">
        This is the personal portfolio and website of Thalida Noel.  This site will be the home of her work (design &amp; development),
        a collection of her thoughts and opinions, and a way her to put her mark on the world and make a name for herself.
        </p>
    </div>
    <div class="sixcol last border-top">
        <h3>Recent Tweet</h3>
        <p id="tweet" class="normal"></p>
    </div>
</div>
<div class="row">
    <div class="threecol">&nbsp;</div>
    <div class="threecol">&nbsp;</div>
    <div class="threecol last border-top">
        <p class="normal"><a href="https://twitter.com/#!/thalidanoel" target="_blank">Follow Me</a></p>
    </div>
</div>
<!--END WELCOME & RECENT TWEET-->

<div class="spacer"></div>

<!--FEATURED PROJECT-->
<div class="row">
    <div class="twelvecol last">
        <h1>/Featured Project</h1>
    </div>
</div>
<div class="row">
    <div class="sixcol border-top">
        <h3>Featured</h3>
        <a href="/projects/view/<?=$fp_id; ?>"><img src="includes/images/portfolio/<?=$fp_id; ?>_sm.png" width="540" height="180" alt="Featured"></a>
    </div>
    <div class="threecol border-top">
        <h3><?=$fp_medium; ?></h3>
        <h2><a href="/projects/view/<?=$fp_id; ?>"><?=$fp_title; ?></a></h2>
        <p class="sub"><?=$fp_date; ?></p>
        <p class="sub"><?=$fp_medium; ?></p>
        <p class="sub"><?=$fp_type; ?></p>
        <p class="sub"><?=$fp_status; ?></p>
    </div>
    <div class="threecol last border-top">
        <h3>Description</h3>
        <p class="normal"><?=$fp_text; ?></p>
        <p class="sub"><?=$fp_tools; ?></p>
    </div>
</div>
<!--END FEATURED PROEJCT-->

<!--VIEW ALL PROEJCTS-->
<div class="row">
    <div class="threecol">&nbsp;</div>
    <div class="threecol">&nbsp;</div>
    <div class="threecol">&nbsp;</div>
    <div class="threecol last border-top">
       <p class="normal"><a href="/projects">View All Projects</a></p>
    </div>
</div>
<!--END VIEW ALL PROJECTS-->

<div class="spacer"></div>

<!--FEATURED THOUGHT-->
<div class="row">
    <div class="twelvecol last">
        <h1>/Featured Thought</h1>
    </div>
</div>
<div class="row">
    <div class="sixcol border-top">
        <h3>Featured <?=$ft_type; ?> On</h3>
        <h2><a href="/thoughts/view/<?=$ft_id; ?>"><?=$ft_title; ?></a></h2>
        <p class="normal"><?=$ft_subtitle; ?></p>
    </div>
    <div class="threecol border-top">
        <h3>Info</h3>
        <p class="normal"><?=$ft_type; ?></p>
        <p class="sub"><?=$ft_date; ?></p>
        <p class="sub"><?=$ft_comments_count; ?> Comments</p>
    </div>
    <div class="threecol last border-top">
        <h3>Excerpt</h3>
        <p class="normal"><?=$ft_text; ?></p>
    </div>
</div>
<!--END FEATURED THOUGHT-->

<!--VIEW ALL THOUGHTS-->
<div class="row">
    <div class="threecol">&nbsp;</div>
    <div class="threecol">&nbsp;</div>
    <div class="threecol">&nbsp;</div>
    <div class="threecol last border-top">
       <p class="normal"><a href="/thoughts">View All Thoughts</a></p>
    </div>
</div>
<!--END VIEW ALL THOUGHTS-->

<div class="spacer"></div>

<!--SIMPLIFIED ABOUT-->
<div class="row">
    <div class="twelvecol last">
        <h1>/Simplified About</h1>
    </div>
</div>
<div class="row">
    <div class="threecol border-top">
        <h3>Recent Picture</h3>
        <img src="includes/images/about_sm.png" width="250" height="108" alt="Thalida Noel">
    </div>
    <div class="sixcol border-top">
        <h3>About Excerpt</h3>
        <p class="normal">
            I am a self-proclaimed web designer/developer/experiencer, but in addition to that I am also a huge robotics enthusiast and I hope to continue working with and growing these various facets of who I am in the future.
        </p>
        <p class="normal">
            I was born in Brooklyn, New York. But, I grew up in Trinidad and Canada. I hope to continue to travel and visit some of the wonderful places around the world.
        </p>
    </div>
    <div class="threecol last border-top">
        <h3>Quick Look</h3>
        <p class="normal">Space Operations Institute (SOI)</p>
        <p class="normal">Developer</p>
        <p class="sub">March 2010 - Present</p>
        <br />
        <p class="normal">Capitol College Robotics</p>
        <p class="normal">President</p>
        <p class="sub">September 2009 - Present</p>
    </div>
</div>
<!--END SIMPLIFIED ABOUT-->

<!--CONTINUE READING ABOUT-->
<div class="row">
    <div class="threecol">&nbsp;</div>
    <div class="threecol">&nbsp;</div>
    <div class="threecol">&nbsp;</div>
    <div class="threecol last border-top">
       <p class="normal"><a href="/about">Continue Reading About</a></p>
    </div>
</div>
<!--END CONTINUE READING ABOUT-->
