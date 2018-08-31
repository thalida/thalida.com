<?
if (isset($_POST['submit_thought'])){
    $response = '';
    $error = 0;
    
    $thought_title = $_POST['thought_title'];
    $thought_subtitle = $_POST['thought_subtitle'];
    $thought_type = $_POST['thought_type'];
    $thought_text = $_POST['thought_text'];
    
    if($thought_title == ''){
        $response .= 'Title Necessary <br />';
        $error = 1;
    }
    if($thought_subtitle == ''){
        $response .= 'Subtitle Necessary <br />';
        $error = 1;
    }
    if($thought_type == ''){
        $response .= 'Type Necessary <br />';
        $error = 1;
    }
    if($thought_text == ''){
        $response .= 'Text Necessary <br />';
        $error = 1;
    }
    if($error == 0){
        $date = time();
        $thought_text = mysql_format($thought_text);
        mysql_query("INSERT INTO post (title, subtitle, type, text, date) VALUES ('$thought_title', '$thought_subtitle', '$thought_type', '$thought_text', '$date')")  or die(mysql_error());
        redirect("/thoughts");
    }
}
?>
<div class="row">
    <div class="twelvecol last">
        <h1><a href="/thoughts">/Thoughts</a> /Add</h1>
    </div>
</div>
<div class="row">
    <div class="sixcol border-top">
        <h3>Add Thought</h3>
        <form id="add_thought_form" method="POST"  action="<? $_SERVER['PHP_SELF']; ?>">
            <p class="normal">
                Type<br />
                <select id="thought_type" name="thought_type" class="form-input">
                    <option value="0">Misc</option>
                    <option value="1">Design</option>
                    <option value="2">Dev</option>
                    <option value="3">Robotics</option>
                    <option value="4">Rant</option>
                    <option value="5">Journal</option>
                </select>
            </p>
            <p class="normal">
                Title<br />
                <input type="text" id="thought_title" name="thought_title" class="form-input" size="82" value="<?=$thought_title; ?>" />
            </p>
            <p class="normal">
                Subtitle<br />
                <input type="text" id="thought_subtitle" name="thought_subtitle" class="form-input" size="82" value="<?=$thought_subtitle; ?>" />
            </p>
            <p class="normal">
                Text<br />
                <textarea id="thought_text" name="thought_text" class="form-input" rows="10" cols="72"><?=$thought_text; ?></textarea>
            </p>
            <p class="normal">
                <input type="submit" id="submit_thought"  name="submit_thought" class="form-submit" value="Submit" />
            </p>
        </form>
    </div>
    <div class="threecol last border-top">
        <h3>Additonal</h3>
        <p class="sub">Add a new thought.</p>
        <p class="normal"><?=$response; ?></p>
    </div>
</div>