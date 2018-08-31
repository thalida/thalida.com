<?
if($start == 1){
	redirect('/');
}
else{
	if($_POST['usrname']){
		$usrname_val = $_POST['usrname'];
		$password_val = $_POST['password'];
		$password_val = md5(md5(md5($password_val)));
		$errors = 1;
		$response = '';
		if (isset($_POST['password'])){
			$errors = 0;
			$login_query="SELECT * FROM usr WHERE password='$password_val' AND usrname='$usrname_val'";
			$login_result=mysql_query($login_query);
			$login_row=mysql_num_rows($login_result);
			
			if($login_row == 0){
			  $response = 'There has been an error with your username and/or password.';
			  $errors = 1;
			}
			  
		}// END SUBMIT LOGIN
		
		if($errors == 0){
			$query  = "SELECT * FROM usr WHERE password='$password_val'";
			$result = mysql_query($query) or die (mysql_error());
			$row = mysql_fetch_array($result);
			
			$_SESSION['start'] = 1;
			$_SESSION['id'] = $row['id']; 
			redirect('/');
		}// END NO ERRORS FOUND
	}
	
?>
<div class="row">
    <div class="sixcol last border-top">
        <h3>Admin Login</h3>
        <div id="loginContainer"> 
        	<p class="normal"><?=$response; ?>
            <form action="<? $_SERVER['PHP_SELF']; ?>" method="post" id="loginForm"> 
                <span class="loginError"></span>
                <h3>Username</h3>
                <input class="form-input" type="text" name="usrname" id="usrname" value="" /><br />
                <h3>Password</h3>
                <input class="form-input" type="password" name="password" id="password" value="" /><br />
                <input class="form-submit" type="submit" id="login" value="Submit" />
            </form>
        </div>
    </div>
</div>

<?
}
?>