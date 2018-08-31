<?
$vp_query = "SELECT * FROM folio WHERE id='$num'";
$vp_result = mysql_query($vp_query);
$vp_row = mysql_num_rows($vp_result);

if($vp_row == 0) redirect("/projects");	

$edit_project_id = mysql_result($vp_result,0,"id");
$edit_project_title = mysql_result($vp_result,0,"title");
$edit_project_type = mysql_result($vp_result,0,"type");
$edit_project_medium = mysql_result($vp_result,0,"medium");
$edit_project_status = mysql_result($vp_result,0,"status");
$edit_project_text = format_text(mysql_result($vp_result,0,"text"));
$edit_project_tools = mysql_result($vp_result,0,"tools");
$edit_project_file = mysql_result($vp_result,0,"file");

if($edit_project_type == 0) $st0 = 'selected="selected"';
else if($edit_project_type == 1) $st1 = 'selected="selected"';
else if($edit_project_type == 2) $st2 = 'selected="selected"';
else if($edit_project_type == 3) $st3 = 'selected="selected"';

if($edit_project_medium == 0) $sm0 = 'selected="selected"';
else if($edit_project_medium == 1) $sm1 = 'selected="selected"';
else if($edit_project_medium == 2) $sm2 = 'selected="selected"';
else if($edit_project_medium == 3) $sm3 = 'selected="selected"';
else if($edit_project_medium == 4) $sm4 = 'selected="selected"';
else if($edit_project_medium == 5) $sm5 = 'selected="selected"';
else if($edit_project_medium == 6) $sm6 = 'selected="selected"';

if($edit_project_status == 0) $ss0 = 'selected="selected"';
else if($edit_project_status == 1) $ss1 = 'selected="selected"';
else if($edit_project_status == 2) $ss2 = 'selected="selected"';
else if($edit_project_status == 3) $ss3 = 'selected="selected"';

if (isset($_POST['submit_edit_project'])){
	$response = '';
	$error = 0;
	
	$edit_project_title = $_POST['edit_project_title'];
	$edit_project_medium = $_POST['edit_project_medium'];
	$edit_project_type = $_POST['edit_project_type'];
	$edit_project_status = $_POST['edit_project_status'];
	$edit_project_tools = $_POST['edit_project_tools'];
	$edit_project_text = $_POST['edit_project_text'];
	$edit_project_file = $_POST['edit_project_file'];
	
	if($edit_project_title == ''){
		$response .= 'Title Necessary <br />';
		$error = 1;
	}
	if($edit_project_medium == ''){
		$response .= 'Medium Necessary <br />';
		$error = 1;
	}
	if($edit_project_type == ''){
		$response .= 'Type Necessary <br />';
		$error = 1;
	}
	if($edit_project_status == ''){
		$response .= 'Status Necessary <br />';
		$error = 1;
	}
	if($edit_project_tools == ''){
		$response	.= 'Tools Necessary <br />';
		$error = 1;
	}
	if($edit_project_text == ''){
		$response	.= 'Text Necessary <br />';
		$error = 1;
	}
	if($error == 0){
		$edit_project_text = mysql_format($edit_project_text);
		mysql_query("UPDATE folio SET title ='$edit_project_title', type='$edit_project_type', medium='$edit_project_medium', status='$edit_project_status', text='$edit_project_text', tools='$edit_project_tools', file='$edit_project_file' WHERE id='$num'")  or die(mysql_error());
		redirect("/projects/view/" . $num);
	}
}
?>
<div class="row">
    <div class="twelvecol last">
        <h1><a href="/projects">/Projects</a> /Edit <a href="/projects/view/<?=$num; ?>">/<?=$edit_project_title; ?></a></h1>
    </div>
</div>
<div class="row">
    <div class="sixcol border-top">
        <h3>Edit Project</h3>
        <form id="edit_project_form" method="POST"  action="<? $_SERVER['PHP_SELF']; ?>">
            <p class="normal">
                Type<br />
                <select id="edit_project_type" name="edit_project_type" class="form-input">
                    <option value="0" <?=$st0; ?>>Misc</option>
                    <option value="1" <?=$st1; ?>>Personal</option>
                    <option value="2" <?=$st2; ?>>Commission</option>
                    <option value="3" <?=$st3; ?>>School</option>
                </select>
            </p>
            <p class="normal">
                Medium<br />

                <select id="edit_project_medium" name="edit_project_medium" class="form-input">
                    <option value="0" <?=$sm0; ?>>Misc</option>
                    <option value="1" <?=$sm1; ?>>Website</option>
                    <option value="2" <?=$sm2; ?>>Program</option>
                    <option value="3" <?=$sm3; ?>>Illustration</option>
                    <option value="4" <?=$sm4; ?>>Logo</option>
                    <option value="5" <?=$sm5; ?>>Robot</option>
                    <option value="6" <?=$sm6; ?>>HTML5</option>
                </select>
            </p>
            <p class="normal">
                Title<br />
                <input type="text" id="edit_project_title" name="edit_project_title" class="form-input" size="82" value="<?=$edit_project_title; ?>" />
            </p>
            <p class="normal">
                Text<br />
                <textarea id="edit_project_text" name="edit_project_text" class="form-input" rows="10" cols="72"><?=$edit_project_text; ?></textarea>
            </p>
            <p class="normal">
                Tools<br />
                <input type="text" id="edit_project_tools" name="edit_project_tools" class="form-input" size="82" value="<?=$edit_project_tools; ?>" />
            </p>
            <p class="normal">
                File (optional)<br />
                <input type="text" id="edit_project_file" name="edit_project_file" class="form-input" size="82" value="<?=$edit_project_file; ?>" />
            </p>
            <p class="normal">
                Status<br />
                <select id="edit_project_status" name="edit_project_status" class="form-input">
                    <option value="0" <?=$ss0; ?>>None</option>
                    <option value="1" <?=$ss1; ?>>In Dev</option>
                    <option value="2" <?=$ss2; ?>>On Hold</option>
                    <option value="3" <?=$ss3; ?>>Completed</option>
                </select>
            </p>
            <p class="normal">
                <input type="submit" id="submit_edit_project"  name="submit_edit_project" class="form-submit" value="Submit" />
            </p>
        </form>
    </div>
    <div class="threecol last border-top">
        <h3>Additonal</h3>
        <p class="sub">Edit new project.</p>
        <p class="normal"><?=$response; ?></p>
    </div>
</div>