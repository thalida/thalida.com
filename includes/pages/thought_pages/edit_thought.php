<?
$et_query = "SELECT * FROM post WHERE id='$num'";
$et_result = mysql_query($et_query);
$et_row = mysql_num_rows($et_result);

if($et_row == 0) redirect("/thoughts");	

$edit_thought_title = mysql_result($et_result,0,"title");
$edit_thought_subtitle = mysql_result($et_result,0,"subtitle");
$edit_thought_type = mysql_result($et_result,0,"type");
$edit_thought_text = format_text(mysql_result($et_result,0,"text"));

if($edit_thought_type == 0) $selected0 = 'selected="selected"';
else if($edit_thought_type == 1) $selected1 = 'selected="selected"';
else if($edit_thought_type == 2) $selected2 = 'selected="selected"';
else if($edit_thought_type == 3) $selected3 = 'selected="selected"';
else if($edit_thought_type == 4) $selected4 = 'selected="selected"';
else if($edit_thought_type == 5) $selected5 = 'selected="selected"';

if (isset($_POST['submit_edit_thought'])){
    $response = '';
    $error = 0;
    
    $edit_thought_title = $_POST['edit_thought_title'];
    $edit_thought_subtitle = $_POST['edit_thought_subtitle'];
    $edit_thought_type = $_POST['edit_thought_type'];
    $edit_thought_text = $_POST['edit_thought_text'];
    
    if($edit_thought_title == ''){
        $response .= 'Title Necessary <br />';
        $error = 1;
    }
    if($edit_thought_subtitle == ''){
        $response .= 'Subtitle Necessary <br />';
        $error = 1;
    }
    if($edit_thought_type == ''){
        $response .= 'Type Necessary <br />';
        $error = 1;
    }
    if($edit_thought_text == ''){
        $response .= 'Text Necessary <br />';
        $error = 1;
    }
    if($error == 0){
        $date = time();
        $edit_thought_text = mysql_format($edit_thought_text);
        mysql_query("UPDATE post SET title='$edit_thought_title', subtitle='$edit_thought_subtitle', type='$edit_thought_type', text='$edit_thought_text', edit='1', edited='$date' WHERE id='$num'") or die (mysql_error());
        redirect("/thoughts/view/" . $num);
    }
}
?>
<div class="row">
    <div class="twelvecol last">
        <h1><a href="/thoughts">/Thoughts</a> /Edit <a href="/thoughts/view/<?=$num; ?>">/<?=$edit_thought_title; ?></a></h1>
    </div>
</div>
<div class="row">
    <div class="sixcol border-top">
        <h3>Edit Thought</h3>
        <form id="edit_thought_form" method="POST"  action="<? $_SERVER['PHP_SELF']; ?>">
            <p class="normal">
                Type<br />
                <select id="edit_thought_type" name="edit_thought_type" class="form-input">
                    <option value="0" <?=$selected0; ?>>Misc</option>
                    <option value="1" <?=$selected1; ?>>Design</option>
                    <option value="2" <?=$selected2; ?>>Dev</option>
                    <option value="3" <?=$selected3; ?>>Robotics</option>
                    <option value="4" <?=$selected4; ?>>Rant</option>
                    <option value="5" <?=$selected5; ?>>Journal</option>
                </select>
            </p>
            <p class="normal">
                Title<br />
                <input type="text" id="edit_thought_title" name="edit_thought_title" class="form-input" size="82" value="<?=$edit_thought_title; ?>" />
            </p>
            <p class="normal">
                Subtitle<br />
                <input type="text" id="edit_thought_subtitle" name="edit_thought_subtitle" class="form-input" size="82" value="<?=$edit_thought_subtitle; ?>" />
            </p>
            <p class="normal">
                Text<br />
                <textarea id="edit_thought_text" name="edit_thought_text" class="form-input" rows="10" cols="72"><?=$edit_thought_text; ?></textarea>
            </p>
            <p class="normal">
                <input type="submit" id="submit_edit_thought"  name="submit_edit_thought" class="form-submit" value="Submit" />
            </p>
        </form>
    </div>
    <div class="threecol last border-top">
        <h3>Additonal</h3>
        <p class="sub">Edit thought.</p>
        <p class="normal"><?=$response; ?></p>
    </div>
</div>