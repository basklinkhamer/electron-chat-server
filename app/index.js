// Require modules
const express = require('express');
const http    = require('http');
const mongoose = require('mongoose');
const socket  = require('socket.io');
const path    = require('path');

// Set the port on which the server can be reached
let port      = 1704;

// Setup application and server
let app       = express();
let server    = http.Server(app);
let io        = socket(server);

app.use(express.static('public'));
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1:27017/bootcamp-chat-server')

let ChatSchema = mongoose.Schema({
    created: Date,
    content: String,
    username: String,
    email: String,
    room: String
});

let Chat = mongoose.model('Chat', ChatSchema);

// --- EXPRESS ROUTES --- //

// Allow CORS in our app
app.all('*', allowCORS);

// Frontend Route forwards any users that attempt direct contact
app.get('/', function(req,res){
    res.redirect('https://hikaru.1vt.nl');
});

// Setup Route to initially setup a new MongoDB
app.post('/setup', setupDB);

// Message Route to return a list of chats in a room
app.get('/msg',getMessageList);

// --- END EXPRESS ROUTES --- //

// --- SOCKET SERVER --- //

io.on('connection', socketConnector);

// --- END SOCKET SERVER --- //

// --- INITIALIZE SERVER --- //

server.listen(port, serverInit);

// --- END INITIALIZATION --- //

function serverInit(){
    console.log('Listening on port', port);
}

function allowCORS(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
    if (req.method == 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }
}

function setupDB(req, res) {
    // Each object in array must match ChatSchema
    let initialChatData = [
        {
            created: new Date(),
            content: 'This is the beginning of this channel',
            username: 'Bas Klinkhamer',
            email: 'bas.klinkhamer@sogeti.com',
            room: 'general'
        }, {
            created: new Date(),
            content: 'Welcome to Frontend!',
            username: 'Bas Klinkhamer',
            email: 'bas.klinkhamer@sogeti.com',
            room: 'frontend'
        }, {
            created: new Date(),
            content: 'This is the design channel',
            username: 'Bas Klinkhamer',
            email: 'bas.klinkhamer@sogeti.com',
            room: 'design'
        }, {
            created: new Date(),
            content: 'Time for pizza & beer',
            username: 'Bas Klinkhamer',
            email: 'bas.klinkhamer@sogeti.com',
            room: 'beer-and-pizza'
        }
    ];

    // Loop through each of the objects in initalChatData
    initialChatData.forEach((chat) => {
        // Create an instance of Chat model
        let newChat = new Chat(chat);
        // Call save to insert to MongoDB
        newChat.save((err,savedChat) => {
            // Log our success to console
            console.log(savedChat);
        });
    });

    // Return a response to finalize the route-request
    res.send('Initial Chat Data inserted');
}

function getMessageList(req, res){
    // Query the MongoDB for chat messages
    Chat.find({
        // Use query parameter "room"
        'room': req.query.room.toLowerCase()
    }).exec((error,messages) => {
        // Respond with found messages
        res.json(messages);
    });
}

function socketConnector(socket){
    // Setup defaults for all our clients
    let defaultRoom = 'general';
    let rooms = ['general','frontend','design','beer-and-pizza'];

    // Log a new connection to console
    console.log('A new socket connection has been made');

    // Emit an 'init' event with the rooms when a client connects
    socket.emit('init', {
        rooms: rooms
    });

    // Listen for user login
    socket.on('userLogin', (data) => {
        // Log the login action to console
        console.log(`${data.username} <${data.email}> logged in`);
        // Set the users room to the default
        data.room = defaultRoom;
        // Join the user into the room
        socket.join(defaultRoom);
        // Log the join action to console
        console.log(`${data.username} <${data.email}> joined #${defaultRoom}`);
        // Let everyone in this room know that the user joined
        io.in(defaultRoom).emit('userJoin', data);
    });

    // Listen for a room switch
    socket.on('switchRoom', (data) => {
        // Leave the old room
        socket.leave(data.oldRoom);
        // Log the leave action to console
        console.log(`${data.username} <${data.email}> left #${data.oldRoom}`);
        // Enter the new room
        socket.join(data.newRoom);
        // Log the join action to console
        console.log(`${data.username} <${data.email}> joined #${data.newRoom}`);
        // Let everyone in the old room know that the user left
        io.in(data.oldRoom).emit('userLeft', data);
        // Let everyone in the new room know that the user joined
        io.in(data.newRoom).emit('userJoin', data);
    });

    socket.on('message', (data) => {
        // Generate a new message object
        let newMessage = new Chat({
            username: data.username,
            email   : data.email,
            content : data.content,
            room    : data.room.toLowerCase(),
            created : new Date()
        });
        // Save message to the database
        newMessage.save((error,message) => {
            // Log the message action to console
            console.log(`${data.room}: ${data.username} <${data.email}> said "${data.content}"`);
            // Let everyone in this room know that a new message is in
            io.in(message.room).emit('addMessage', message);
        });
    });

    socket.on('disconnect', () => {
        console.log('A socket connection was closed');
        socket.disconnect();
    });
}
