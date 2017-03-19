const express = require('express');
const http    = require('http');
const socket  = require('socket.io');
const path    = require('path');

let app       = express();
let server    = http.Server(app);
let io        = socket(server);

let port      = 1704;

app.use(express.static('public'));

app.get('/', function(req,res){
    res.sendFile(path.resolve('public/index.html'));
});

io.on('connection', socketConnector);

server.listen(port, serverInit);

function serverInit(){
    console.log('Listening on port', port);
}

function socketConnector(socket){
    console.log('A user connected');
    socket.on('disconnect', function(){
        console.log('A user disconnected');
    });
    socket.on('chatMessage', function(msg){
        console.log('message: ' + msg);
        io.emit('chatMessage', msg);
    });
}
