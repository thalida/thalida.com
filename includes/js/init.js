$(document).ready(function(){
	$('<img />').attr('src', '/includes/images/full_bg2.png').attr('id', 'full-screen-image').load(function(){
        $('body').prepend( $(this) );
    });
	
	var twitter_name = 'thalidanoel';
    $.getJSON('http://twitter.com/statuses/user_timeline.json?screen_name=' + twitter_name + '&count=1&callback=?', function(data)      {
        var tweet = data[0].text;
      	tweet = tweet.replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, function(url) {
            return '<a href="'+url+'" target="_blank">'+url+'</a>';
        }).replace(/@([_a-z0-9]+)/ig, function(reply) {
            return  '<a href="http://twitter.com/'+reply.substring(1)+'" target="_blank">@'+reply.substring(1)+'</a>';
        }).replace(/#([_a-z0-9]+)/ig, function(reply) {
            return  '<a href="https://twitter.com/#!/search/realtime/%23'+reply.substring(1)+'" target="_blank">#'+reply.substring(1)+'</a>';
        });
      	$("#tweet").html(tweet);
    }); 
	
	$('#comment_name').keyup(function(){
		var val = $(this).val();
		var name_regex = /^([A-Za-z0-9])+$/;
		var name_length = val.length;
		$('#form-name-error').html('');
		$('#form-comment-error').html('');
		if(name_length == 0) $('#form-name-error').html('A name is required.');
		else if( !name_regex.test(val) ) $('#form-name-error').html('Only alphanumeric characters.');
		else if(name_length < 3 || name_length > 20) $('#form-name-error').html('Only 3-20 characters.');
	});
	
	$('#comment_text').keyup(function(){
		var name_length = $('#comment_name').val().length;
		$('#form-comment-error').html('');
		if(name_length == 0) $('#form-name-error').html('A name is required.');
	});
	
	$('#new_comment_form').submit(function(){
		var name_regex = /^([A-Za-z0-9])+$/;
		var name_val = $('#comment_name').val();
		var comment_val = $('#comment_text').val();
		var valid = 1;
		
		
		if( name_val.length == 0 ){ valid = 0; $('#form-name-error').html('A name is required.'); }
		else if( !name_regex.test(name_val) ){ valid = 0; $('#form-name-error').html('Only alphanumeric characters.'); }
		else if( name_val.length < 3 || name_val.length > 20 ){ valid = 0; $('#form-name-error').html('Only 3-20 characters.'); }
		
		if( comment_val.length == 0 ){ valid = 0; $('#form-comment-error').html('A comment is required.'); }
		
		if(valid) return true;
		else return false;
	});
		
});










