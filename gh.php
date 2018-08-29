<?php 
$output = shell_exec('git fetch --all; git reset --hard origin/master;');
echo "<pre>$output</pre>";
