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

// Frontend Route to display our chatboxes on a viewer
app.get('/', function(req,res){
    res.sendFile(path.resolve('public/index.html'));
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
    let initalChatData = [
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
            room: 'pizza-and-beer'
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

    // Emit an 'init' event with the rooms when a client connects
    socket.emit('init', {
        rooms: rooms
    });

    // Listen for user login
    socket.on('userLogin', (data) => {
        // Set the users room to the default
        data.room = defaultRoom;
        // Join the user into the room
        socket.join(defaultRoom);
        // Let everyone in this room know that the user joined
        io.in(defaultRoom).emit('userJoin', data);
    });

    // Listen for a room switch
    socket.on('switchRoom', (data) => {
        // Leave the old room
        socket.leave(data.oldRoom);
        // Enter the new room
        socket.join(data.newRoom);
        // Let everyone in the old room know that the user left
        io.in(data.oldRoom).emit('userLeft', data);
        // Let everyone in the new room know that the user joined
        io.in(data.newRoom).emit('userJoined', data);
    });

    socket.on('message', (data) => {
        // Generate a new message object
        let newMessage = new Chat({
            username: data.username,
            content : data.content,
            room    : data.room.toLowerCase(),
            created : new Date()
        });
        // Save message to the database
        newMessage.save((error,message) => {
            // Let everyone in this room know that a new message is in
            io.in(message.room).emit('addMessage', message);
        });
    });
}
