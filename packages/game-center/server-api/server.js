const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const db = require('./models/db');
require('dotenv').config();

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: ['http://localhost:3000', 'http://localhost:3001'], methods: ['GET', 'POST'], credentials: true },
});

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Attach the Socket.IO instance to every request for easy access
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Set up routes for different functionalities
app.use('/auth', require('./routes/authRoutes'));
app.use('/games', require('./routes/gameRoutes'));
app.use('/lobbies', require('./routes/lobbyRoutes'));
app.use('/users', require('./routes/userRoute'));
app.use('/notifications', require('./routes/notificationRoutes'));


app.get('/', (req, res) => {
    res.send('Game Lobby API is running!');
});

app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

const gameRooms = {}; // Store active game rooms
const playerSockets = {}; // Track player socket connections

const colors = ['blue', 'yellow', 'pink', 'green', 'purple']; // Available colors for players

// Generate a random bingo board with 15 numbers
const generateRandomBoard = () => {
    const numbers = new Set(); // Use a Set to ensure unique numbers
    while (numbers.size < 15) { // We need exactly 15 numbers
        numbers.add(Math.floor(Math.random() * 90) + 1); // Add a random number between 1 and 90
    }
    const board = Array(27).fill(null); // Create a 3x9 board, initially empty
    const allNumbers = Array.from(numbers); // Convert Set to Array for easier access

    // Fill each row with 5 numbers in random columns
    for (let row = 0; row < 3; row++) {
        const indices = [row * 9, row * 9 + 1, row * 9 + 2, row * 9 + 3, row * 9 + 4, row * 9 + 5, row * 9 + 6, row * 9 + 7, row * 9 + 8]
            .sort(() => Math.random() - 0.5) // Shuffle the indices
            .slice(0, 5); // Take 5 random columns
        indices.forEach((i, index) => {
            board[i] = allNumbers[row * 5 + index]; // Place numbers in the selected columns
        });
    }

    // Verify that the board has exactly 15 numbers
    const nonNullCount = board.filter(cell => cell !== null).length;
    if (nonNullCount !== 15) {
        return generateRandomBoard(); // Retry if the board is invalid
    }
    return board;
};

// Pick a random color for a player
const getRandomColor = () => {
    return colors[Math.floor(Math.random() * colors.length)]; // Select a random color from the list
};

// Close expired lobbies 
const closeExpiredLobbies = async () => {
    try {
        // Close event lobbies that have expired
        const eventLobbiesResult = await db.query(
            `UPDATE lobbies SET lobby_status = 'closed' WHERE is_event = true AND end_time < NOW() AND lobby_status = 'active' RETURNING id`
        );
        if (eventLobbiesResult.rows.length > 0) {
            eventLobbiesResult.rows.forEach((lobby) => {
                io.to(lobby.id).emit('lobby_closed', { lobbyId: lobby.id }); // Notify players in the lobby
            });
        }

        // Close normal lobbies that have been inactive for 8 hours and have no creator present
        const normalLobbiesResult = await db.query(
            `UPDATE lobbies SET lobby_status = 'closed' WHERE is_event = false AND lobby_status = 'active' AND updated_at < NOW() - INTERVAL '8 hours' AND NOT EXISTS (SELECT 1 FROM lobby_players lp JOIN lobbies l ON lp.lobby_id = l.id WHERE lp.lobby_id = lobbies.id AND lp.user_id = l.created_by) RETURNING id`
        );
        if (normalLobbiesResult.rows.length > 0) {
            for (const lobby of normalLobbiesResult.rows) {
                await db.query('DELETE FROM lobby_players WHERE lobby_id = $1', [lobby.id]); // Remove players from the lobby
            }
        }
    } catch (err) {
        console.error('Error while closing expired lobbies:', err);
    }
};
// Run the cleanup function every 10 minutes
setInterval(closeExpiredLobbies, 10 * 60 * 1000);

// Define winning patterns for bingo 
const winPatterns = [
    ['00', '01', '02', '03', '04'], // First row
    ['10', '11', '12', '13', '14'], // Second row
    ['20', '21', '22', '23', '24'], // Third row
];

// Handle Socket.IO connections
io.on('connection', (socket) => {
    // When a player creates a new game room
    socket.on('create_game_room', async ({ gameId, roomId, userId }) => {
        // Initialize the game room if it doesn't exist
        if (!gameRooms[roomId]) {
            gameRooms[roomId] = {
                gameId,
                boards: {},
                playerColors: {},
                selectedCells: {},
                cingoCount: {}, // Track bingo completions per player
                turn: null,
                started: false,
                winner: null,
                players: [],
                currentNumber: 1,
                drawnNumbers: [],
            };
        }
        socket.join(roomId); // Add the socket to the room
        const userResult = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
        const username = userResult.rows[0]?.name || socket.username || 'Anonymous'; // Get the player's username
        gameRooms[roomId].players.push({ id: userId, name: username, socketId: socket.id }); // Add player to the room
        gameRooms[roomId].boards[userId] = generateRandomBoard(); // Generate a board for the player
        gameRooms[roomId].playerColors[userId] = getRandomColor(); // Assign a random color
        gameRooms[roomId].cingoCount[userId] = 0; // Initialize bingo count
        if (!gameRooms[roomId].selectedCells[userId]) gameRooms[roomId].selectedCells[userId] = []; // Initialize selected cells
        playerSockets[userId] = socket.id; // Track the player's socket
        io.to(roomId).emit('player_joined', { playerName: username }); // Notify others in the room
        // Send the game state to the player
        socket.emit('game_state', {
            board: gameRooms[roomId].boards[userId],
            playerColor: gameRooms[roomId].playerColors[userId],
            selectedCells: gameRooms[roomId].selectedCells[userId],
            cingoCount: gameRooms[roomId].cingoCount[userId],
            players: gameRooms[roomId].players,
            turn: gameRooms[roomId].turn,
            started: gameRooms[roomId].started,
            winner: gameRooms[roomId].winner,
            currentNumber: gameRooms[roomId].currentNumber,
            drawnNumbers: gameRooms[roomId].drawnNumbers,
        });
    });

    // When a player joins an existing game
    socket.on('join_game', async ({ gameName, id, userId }) => {
        try {
            socket.join(id); // Add the socket to the game room
            const userResult = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                socket.emit('error', { message: 'User not found.' });
                return;
            }
            const username = userResult.rows[0].name || 'Anonymous'; // Get the player's username

            // Initialize the game room if it doesn't exist
            if (!gameRooms[id]) {
                const playersResult = await db.query(
                    'SELECT u.id, u.name FROM lobby_players lp JOIN users u ON lp.user_id = u.id WHERE lp.lobby_id = $1',
                    [id]
                );
                const players = playersResult.rows.map(p => ({ id: p.id, name: p.name, socketId: null }));
                gameRooms[id] = {
                    gameId: gameName,
                    boards: {},
                    playerColors: {},
                    selectedCells: {},
                    cingoCount: {},
                    turn: null,
                    started: false,
                    winner: null,
                    players,
                    currentNumber: 1,
                    drawnNumbers: [],
                };
                // Generate boards for all players in the lobby
                for (const player of players) {
                    const newBoard = generateRandomBoard();
                    if (!newBoard || newBoard.every(cell => cell === null)) {
                        socket.emit('error', { message: `Failed to create board for: ${player.id}` });
                        return;
                    }
                    gameRooms[id].boards[player.id] = newBoard;
                    gameRooms[id].playerColors[player.id] = getRandomColor();
                    gameRooms[id].cingoCount[player.id] = 0;
                    gameRooms[id].selectedCells[player.id] = [];
                }
            } else {
                // Add the player to the existing room or update their socket
                if (!gameRooms[id].players.some(p => p.id === userId)) {
                    gameRooms[id].players.push({ id: userId, name: username, socketId: socket.id });
                } else {
                    gameRooms[id].players = gameRooms[id].players.map(p =>
                        p.id === userId ? { ...p, socketId: socket.id } : p
                    );
                }
                // Generate a board if the player doesn't have one
                if (!gameRooms[id].boards[userId]) {
                    const newBoard = generateRandomBoard();
                    if (!newBoard || newBoard.every(cell => cell === null)) {
                        socket.emit('error', { message: `Failed to create board for: ${userId}` });
                        return;
                    }
                    gameRooms[id].boards[userId] = newBoard;
                    gameRooms[id].playerColors[userId] = getRandomColor();
                    gameRooms[id].cingoCount[userId] = 0;
                    gameRooms[id].selectedCells[userId] = [];
                }
            }

            playerSockets[userId] = socket.id; // Track the player's socket
            const board = gameRooms[id].boards[userId];
            if (!board || board.every(cell => cell === null)) {
                socket.emit('error', { message: 'Invalid board received.' });
                return;
            }

            // Send the game state to the player
            socket.emit('game_state', {
                board: board,
                playerColor: gameRooms[id].playerColors[userId],
                selectedCells: gameRooms[id].selectedCells[userId],
                cingoCount: gameRooms[id].cingoCount[userId],
                players: gameRooms[id].players,
                turn: gameRooms[id].turn,
                started: gameRooms[id].started,
                winner: gameRooms[id].winner,
                currentNumber: gameRooms[id].currentNumber,
                drawnNumbers: gameRooms[id].drawnNumbers,
            });
            socket.to(id).emit('player_joined', { playerName: username }); // Notify other players

        } catch (err) {

            socket.emit('error', { message: 'An error occurred while loading the game.' });
        }
    });

    // When a player starts the game
    socket.on('start_game', ({ gameName, id, userId }) => {
        if (!gameRooms[id]) {
            socket.emit('error', { message: 'Game room not found.' });
            return;
        }

        // Ensure all players have valid boards
        for (const player of gameRooms[id].players) {
            const board = gameRooms[id].boards[player.id];
            if (!board || !Array.isArray(board) || board.every(cell => cell === null)) {

                gameRooms[id].boards[player.id] = generateRandomBoard();
            }
        }

        gameRooms[id].started = true; // Mark the game as started
        gameRooms[id].turn = gameRooms[id].players[0]?.name || 'Anonymous'; // Set the first player's turn

        // Update all players with the new game state
        for (const player of gameRooms[id].players) {
            if (player.socketId) {
                io.to(player.socketId).emit('game_state', {
                    board: gameRooms[id].boards[player.id],
                    playerColor: gameRooms[id].playerColors[player.id],
                    selectedCells: gameRooms[id].selectedCells[player.id],
                    cingoCount: gameRooms[id].cingoCount[player.id],
                    players: gameRooms[id].players,
                    turn: gameRooms[id].turn,
                    started: gameRooms[id].started,
                    winner: gameRooms[id].winner,
                    currentNumber: gameRooms[id].currentNumber,
                    drawnNumbers: gameRooms[id].drawnNumbers,
                });
            }
        }

    });

    // When a player draws a number
    socket.on('draw_number', ({ id, userId }) => {
        const game = gameRooms[id];
        if (!game || !game.started || game.winner) {

            return;
        }

        // Check if all numbers have been drawn 
        if (game.drawnNumbers.length >= 90) {
            game.winner = 'Draw'; // If all numbers are drawn, it's a draw
            io.to(id).emit('game_won', { winner: 'Draw' });
            return;
        }

        // Draw a unique random number
        let number;
        do {
            number = Math.floor(Math.random() * 90) + 1;
        } while (game.drawnNumbers.includes(number));
        game.drawnNumbers.push(number);
        game.currentNumber = number;

        // Rotate turns if there are multiple players
        if (game.players.length > 1) {
            const currentPlayerIndex = game.players.findIndex(p => p.id === userId);
            const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
            game.turn = game.players[nextPlayerIndex]?.name || game.players[0]?.name;
        } else {
            game.turn = game.players[0]?.name;
        }

        // Notify all players of the drawn number
        io.to(id).emit('draw_number', { number, drawnNumbers: game.drawnNumbers });

        // Update all players with the new game state
        for (const player of game.players) {
            if (player.socketId) {
                io.to(player.socketId).emit('game_state', {
                    board: game.boards[player.id],
                    playerColor: game.playerColors[player.id],
                    selectedCells: game.selectedCells[player.id],
                    cingoCount: game.cingoCount[player.id],
                    players: game.players,
                    turn: game.turn,
                    started: game.started,
                    winner: game.winner,
                    currentNumber: game.currentNumber,
                    drawnNumbers: game.drawnNumbers,
                });
            }
        }

    });

    // When a player makes a move 
    socket.on('make_move', ({ id, cellId, userId }) => {
        const game = gameRooms[id];
        if (!game || !game.started || game.winner) {
            socket.emit('error', { message: 'Game not started or already ended.' });
            return;
        }

        const player = game.players.find(p => p.id === userId);
        if (!player) {
            socket.emit('error', { message: 'Player not found.' });
            return;
        }

        if (!game.selectedCells[userId]) game.selectedCells[userId] = []; // Initialize selected cells if not present

        const row = parseInt(cellId[0], 10);
        const col = parseInt(cellId[1], 10);
        const index = row * 9 + col;
        const playerBoard = game.boards[userId];


        // Validate the move
        if (index >= 0 && index < 27 && playerBoard[index] !== null && playerBoard[index] !== undefined) {
            const boardValue = playerBoard[index];
            if (!game.selectedCells[userId].includes(cellId) && game.drawnNumbers.includes(boardValue)) {
                game.selectedCells[userId].push(cellId); // Mark the cell
                // Update the player's game state
                socket.emit('game_state', {
                    board: game.boards[userId],
                    playerColor: game.playerColors[userId],
                    selectedCells: game.selectedCells[userId],
                    cingoCount: game.cingoCount[userId],
                    players: game.players,
                    turn: game.turn,
                    started: game.started,
                    winner: game.winner,
                    currentNumber: game.currentNumber,
                    drawnNumbers: game.drawnNumbers,
                });
                // Update other players with minimal state
                socket.to(id).emit('game_state', {
                    players: game.players,
                    turn: game.turn,
                    started: game.started,
                    winner: game.winner,
                    currentNumber: game.currentNumber,
                    drawnNumbers: game.drawnNumbers,
                });
            } else {
                let errorMessage = 'Marking failed: ';
                if (game.selectedCells[userId].includes(cellId)) {
                    errorMessage += 'Cell already marked.';
                } else if (!game.drawnNumbers.includes(boardValue)) {
                    errorMessage += 'Number not in drawn numbers.';
                }
                socket.emit('error', { message: errorMessage });

                return;
            }
        } else {
            socket.emit('error', { message: 'Invalid cell or number.' });
            return;
        }

        // Check for bingo
        const selectedCells = game.selectedCells[userId] || [];
        let patternCount = 0;
        const boardNumbers = game.boards[userId];

        for (let row = 0; row < 3; row++) {
            // Find valid cells in the row
            const startIndex = row * 9;
            const endIndex = startIndex + 9;
            const rowNumbers = boardNumbers.slice(startIndex, endIndex);
            const validCells = [];
            for (let col = 0; col < 9; col++) {
                const idx = startIndex + col;
                if (rowNumbers[col] !== null && rowNumbers[col] !== undefined) {
                    const cellId = `${row}${col}`;
                    validCells.push(cellId);
                }
            }

            // Check if all 5 valid cells in the row are marked
            const isCingo = validCells.length === 5 && validCells.every(cellId => selectedCells.includes(cellId));

            if (isCingo) {
                patternCount++;
            }
        }


        // Update bingo count if a new bingo is achieved
        if (patternCount > game.cingoCount[userId]) {
            game.cingoCount[userId] = patternCount;
            io.to(id).emit('cingo_updated', { userId, cingoCount: game.cingoCount[userId] });

            // Check for a win 
            if (game.cingoCount[userId] >= 3) {
                game.winner = player.name;
                io.to(id).emit('game_won', { winner: player.name });
            }
        }
    });

    // When a player resets the game
    socket.on('reset_game', ({ id }) => {
        if (gameRooms[id]) {
            const newBoards = {};
            const newPlayerColors = {};
            const newCingoCount = {};
            gameRooms[id].players.forEach(player => {
                newBoards[player.id] = generateRandomBoard(); // Generate new boards
                newPlayerColors[player.id] = getRandomColor(); // Assign new colors
                newCingoCount[player.id] = 0; // Reset bingo counts
            });
            // Reset the game room state
            gameRooms[id] = {
                gameId: gameRooms[id].gameId,
                boards: newBoards,
                playerColors: newPlayerColors,
                selectedCells: {},
                cingoCount: newCingoCount,
                turn: null,
                started: false,
                winner: null,
                players: gameRooms[id].players,
                currentNumber: 1,
                drawnNumbers: [],
            };
            // Update all players with the new state
            for (const player of gameRooms[id].players) {
                if (player.socketId) {
                    io.to(player.socketId).emit('game_state', {
                        board: gameRooms[id].boards[player.id],
                        playerColor: gameRooms[id].playerColors[player.id],
                        selectedCells: gameRooms[id].selectedCells[player.id],
                        cingoCount: gameRooms[id].cingoCount[player.id],
                        players: gameRooms[id].players,
                        turn: gameRooms[id].turn,
                        started: gameRooms[id].started,
                        winner: gameRooms[id].winner,
                        currentNumber: gameRooms[id].currentNumber,
                        drawnNumbers: gameRooms[id].drawnNumbers,
                    });
                }
            }
        }
    });

    // Set a username for the socket
    socket.on('set_username', (username) => {
        socket.username = username;
    });

    // Handle chat messages
    socket.on('sendMessage', (content) => {
        io.emit('newMessage', {
            username: socket.username || 'Anonymous',
            content,
            timestamp: new Date().toISOString(),
        });
    });

    // When a player joins a lobby
    socket.on('join_lobby', async ({ lobbyId, userId, silent }) => {
        socket.join(lobbyId); // Add the socket to the lobby
        if (!silent) {
            const userResult = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
            const username = userResult.rows[0]?.name || socket.username || 'A user';
            const joinMessage = {
                user: 'System',
                content: `${username} joined the lobby!`,
                timestamp: new Date().toISOString(),
                isSystem: true,
            };
            await db.query('INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)', [lobbyId, null, joinMessage.content]);
            io.to(lobbyId).emit('receive_message', joinMessage); // Notify lobby members
            io.to(lobbyId).emit('lobby_joined', { userId }); // Update lobby state
        }
    });

    // When a player sends a message in the lobby
    socket.on('send_message', async ({ lobbyId, userId, content }) => {
        const message = {
            user: socket.username || 'Anonymous',
            content,
            timestamp: new Date().toISOString(),
        };
        try {
            await db.query('INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)', [lobbyId, userId, content]);
            io.to(lobbyId).emit('receive_message', message); // Broadcast the message
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    // When a player leaves the lobby
    socket.on('leave_lobby', async ({ lobbyId, userId }) => {
        socket.leave(lobbyId); // Remove the socket from the lobby
        const leaveMessage = {
            user: 'System',
            content: `${socket.username || 'A user'} left the lobby!`,
            timestamp: new Date().toISOString(),
        };
        try {
            const existingMessage = await db.query(
                'SELECT * FROM lobby_messages WHERE lobby_id = $1 AND message = $2 AND created_at > NOW() - INTERVAL \'5 seconds\'',
                [lobbyId, leaveMessage.content]
            );
            if (existingMessage.rows.length === 0) {
                await db.query('INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)', [lobbyId, userId || null, leaveMessage.content]);
                io.to(lobbyId).emit('receive_message', leaveMessage); // Notify remaining players
            }
        } catch (err) {
            console.error('Error handling leave_lobby:', err);
        }
    });

    // Handle lobby invitations
    socket.on('lobby_invite', async ({ lobbyId, userId, invitedUserId, lobbyName, invitationId }) => {
        try {
            socket.to(invitedUserId).emit('lobby_invite', {
                lobbyId,
                lobbyName,
                senderId: userId,
                invocationId: invitationId,
            });
        } catch (err) {
            console.error('Error emitting lobby invite:', err);
        }
    });

    // When a lobby invite is accepted
    socket.on('lobby_invite_accepted', async ({ lobbyId, receiverId, lobbyName }) => {
        try {
            socket.to(lobbyId).emit('lobby_joined', { userId: receiverId });
        } catch (err) {
            console.error('Error emitting lobby invite accepted:', err);
        }
    });

    // When a lobby invite is rejected
    socket.on('lobby_invite_rejected', async ({ lobbyId, receiverId, lobbyName, receiverName }) => {
        try {
            socket.to(lobbyId).emit('lobby_invite_rejected', { receiverId, receiverName, lobbyName });
        } catch (err) {
            console.error('Error emitting lobby invite rejected:', err);
        }
    });

    // Handle game invitations
    socket.on('game_invite', async ({ lobbyId, userId, invitedUserId }) => {
        try {
            await db.query('INSERT INTO notifications (user_id, type, content) VALUES ($1, \'game_invite\', $2)', [invitedUserId, JSON.stringify({ lobbyId, senderId: userId })]);
            socket.to(invitedUserId).emit('game_invite', { lobbyId, senderId: userId });
        } catch (err) {
            console.error('Error sending invite:', err);
        }
    });

    socket.on('friend_request', async ({ senderId, receiverId }) => {
        socket.to(receiverId).emit('friend_request', { senderId });
    });

    socket.on('friend_accepted', async ({ senderId, receiverId }) => {
        socket.to(senderId).emit('friend_accepted', { receiverId });
    });

    // Handle turn-based game events
    socket.on('turn_based', async ({ gameId, userId }) => {
        socket.to(userId).emit('turn_based', { gameId });
    });

    socket.on('friend_removed', async ({ userId, friendId }) => {
        socket.to(friendId).emit('friend_removed', { userId });
    });

    socket.on('event_started', async ({ lobbyId }) => {
        socket.to(lobbyId).emit('event_started', { lobbyId });
    });

    // Handle socket disconnections
    socket.on('disconnect', () => {
        for (const roomId in gameRooms) {
            gameRooms[roomId].players = gameRooms[roomId].players.filter(p => p.socketId !== socket.id); // Remove the player from the room
            if (gameRooms[roomId].players.length === 0) {
                delete gameRooms[roomId]; // Delete the room if no players remain
            } else {
                // Update remaining players with the new state
                for (const player of gameRooms[roomId].players) {
                    if (player.socketId) {
                        io.to(player.socketId).emit('game_state', {
                            board: gameRooms[roomId].boards[player.id],
                            playerColor: gameRooms[roomId].playerColors[player.id],
                            selectedCells: gameRooms[roomId].selectedCells[player.id],
                            cingoCount: gameRooms[roomId].cingoCount[player.id],
                            players: gameRooms[roomId].players,
                            turn: gameRooms[roomId].turn,
                            started: gameRooms[roomId].started,
                            winner: gameRooms[roomId].winner,
                            currentNumber: gameRooms[roomId].currentNumber,
                            drawnNumbers: gameRooms[roomId].drawnNumbers,
                        });
                    }
                }
            }
        }
        // Remove the player from the socket tracking
        for (const userId in playerSockets) {
            if (playerSockets[userId] === socket.id) {
                delete playerSockets[userId];
            }
        }
    });
});

const PORT = 8081; // Define the port for the server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`)); // Start the server