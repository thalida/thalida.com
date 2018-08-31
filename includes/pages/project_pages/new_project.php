<?
if (isset($_POST['submit_project'])){
	$response = '';
	$error = 0;
	
	$project_title = $_POST['project_title'];
	$project_medium = $_POST['project_medium'];
	$project_type = $_POST['project_type'];
	$project_status = $_POST['project_status'];
	$project_tools = $_POST['project_tools'];
	$project_text = $_POST['project_text'];
	$project_file = $_POST['project_file'];
	
	if($project_title == ''){
		$response	.= 'Title Necessary <br />';
		$error = 1;
	}
	if($project_medium == ''){
		$response	.= 'Medium Necessary <br />';
		$error = 1;
	}
	if($project_type == ''){
		$response	.= 'Type Necessary <br />';
		$error = 1;
	}
	if($project_status == ''){
		$response	.= 'Status Necessary <br />';
		$error = 1;
	}
	if($project_tools == ''){
		$response	.= 'Tools Necessary <br />';
		$error = 1;
	}
	if($project_text == ''){
		$response	.= 'Text Necessary <br />';
		$error = 1;
	}
	if($error == 0){
		$date = time();
		$project_text = mysql_format($project_text);
		mysql_query("INSERT INTO folio (title, type, medium, status, text, tools, file, date) VALUES ('$project_title', '$project_type', '$project_medium', '$project_status', '$project_text', '$project_tools', '$project_file', '$date')")  or die(mysql_error());
		?>
		<script type="text/javascript">
			<!--
			top.location = "/projects";
			-->
		</script>
		<?
	}
}
?>
<div class="row">
    <div class="twelvecol last">
        <h1><a href="/projects">/Projects</a> /Add</h1>
    </div>
</div>
<div class="row">
    <div class="sixcol border-top">
        <h3>Add Project</h3>
        <form id="add_project_form" method="POST"  action="<? $_SERVER['PHP_SELF']; ?>">
            <p class="normal">
                Type<br />
                <select id="project_type" name="project_type" class="form-input">
                    <option value="0">Misc</option>
                    <option value="1">Personal</option>
                    <option value="2">Commission</option>
                    <option value="3">School</option>
                </select>
            </p>
            <p class="normal">
                Medium<br />
                <select id="project_medium" name="project_medium" class="form-input">
                    <option value="0">Misc</option>
                    <option value="1">Website</option>
                    <option value="2">Program</option>
                    <option value="3">Illustration</option>
                    <option value="4">Logo</option>
                    <option value="5">Robot</option>
                    <option value="6">HTML5</option>
                </select>
            </p>
            <p class="normal">
                Title<br />
                <input type="text" id="project_title" name="project_title" class="form-input" size="82" value="<?=$project_title; ?>" />
            </p>
            <p class="normal">
                Text<br />
                <textarea id="project_text" name="project_text" class="form-input" rows="10" cols="72"><?=$project_text; ?></textarea>
            </p>
            <p class="normal">
                Tools<br />
                <input type="text" id="project_tools" name="project_tools" class="form-input" size="82" value="<?=$project_tools; ?>" />
            </p>
            <p class="normal">
                File (optional)<br />
                <input type="text" id="project_file" name="project_file" class="form-input" size="82" value="<?=$project_file; ?>" />
            </p>
            <p class="normal">
                Status<br />
                <select id="project_status" name="project_status" class="form-input">
                    <option value="0">None</option>
                    <option value="1">In Dev</option>
                    <option value="2">On Hold</option>
                    <option value="3">Completed</option>
                </select>
            </p>
            <p class="normal">
                <input type="submit" id="submit_project"  name="submit_project" class="form-submit" value="Submit" />
            </p>
        </form>
    </div>
    <div class="threecol last border-top">
        <h3>Additonal</h3>
        <p class="sub">Add a new project.</p>
        <p class="normal"><?=$response; ?></p>
    </div>
</div>