$(function () {
    // Setup a new socket.io connection
    var socket = io();

    // Use jQuery to submit the form above
    $('form').submit(function(){
        // Emit chatMessage event with #message's value
        socket.emit('chatMessage', $('#message').val());
        // Reset #message value to nothing
        $('#message').val('');
        // Exit function
        return false;
    });

    // When a chatMessage event is received from server
    socket.on('chatMessage', function(msg){
        // Use jQuery to append received msg to #messageList
        $('#messageList').append(
            $('<li>').text(msg)
        );
    });
});
