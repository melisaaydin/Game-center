const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const db = require('./models/db');
require('dotenv').config();

// Initialize Express server and Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: ['http://localhost:3000', 'http://localhost:3001'], methods: ['GET', 'POST'], credentials: true },
    transports: ['websocket', 'polling'],
});

// Middleware setup
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Attach Socket.IO instance to request object
app.use((req, res, next) => {
    req.io = io;
    next();
});

// API routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/games', require('./routes/gameRoutes'));
app.use('/lobbies', require('./routes/lobbyRoutes'));
app.use('/users', require('./routes/userRoute'));
app.use('/notifications', require('./routes/notificationRoutes'));

// Root route
app.get('/', (req, res) => {
    res.send('Game Lobby API is running!');
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

// Game room and player management
const gameRooms = {};
const playerSockets = {};
const colors = ['darkcyan', 'yellow', 'pink', 'green', 'peru'];

// Generate a random bingo board
const generateRandomBoard = () => {
    const numbers = new Set();
    while (numbers.size < 15) {
        numbers.add(Math.floor(Math.random() * 90) + 1);
    }
    const board = Array(27).fill(null);
    const allNumbers = Array.from(numbers);
    for (let row = 0; row < 3; row++) {
        const indices = [row * 9, row * 9 + 1, row * 9 + 2, row * 9 + 3, row * 9 + 4, row * 9 + 5, row * 9 + 6, row * 9 + 7, row * 9 + 8]
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);
        indices.forEach((i, index) => {
            board[i] = allNumbers[row * 5 + index];
        });
    }
    const nonNullCount = board.filter(cell => cell !== null).length;
    if (nonNullCount !== 15) {
        return generateRandomBoard();
    }
    return board;
};

// Get a random color for a player
const getRandomColor = () => {
    return colors[Math.floor(Math.random() * colors.length)];
};

// Periodically close expired lobbies
const closeExpiredLobbies = async () => {
    try {
        // Close event lobbies that have ended
        const eventLobbiesResult = await db.query(
            `UPDATE lobbies SET lobby_status = 'closed' WHERE is_event = true AND end_time < NOW() AND lobby_status = 'active' RETURNING id`
        );
        if (eventLobbiesResult.rows.length > 0) {
            eventLobbiesResult.rows.forEach((lobby) => {
                io.to(lobby.id).emit('lobby_closed', { lobbyId: lobby.id });
            });
        }
        // Close inactive normal lobbies
        const normalLobbiesResult = await db.query(
            `UPDATE lobbies SET lobby_status = 'closed' WHERE is_event = false AND lobby_status = 'active' AND updated_at < NOW() - INTERVAL '8 hours' AND NOT EXISTS (SELECT 1 FROM lobby_players lp JOIN lobbies l ON lp.lobby_id = l.id WHERE lp.lobby_id = lobbies.id AND lp.user_id = l.created_by) RETURNING id`
        );
        if (normalLobbiesResult.rows.length > 0) {
            for (const lobby of normalLobbiesResult.rows) {
                await db.query('DELETE FROM lobby_players WHERE lobby_id = $1', [lobby.id]);
            }
        }
    } catch (err) {
        console.error('Error while closing expired lobbies:', err);
    }
};
setInterval(closeExpiredLobbies, 10 * 60 * 1000);

// Winning patterns for bingo
const winPatterns = [
    ['00', '01', '02', '03', '04'],
    ['10', '11', '12', '13', '14'],
    ['20', '21', '22', '23', '24'],
];

// Filter active players' boards
const filterActiveBoards = (game) => {
    if (!game.started) {
        return {};
    }
    const activeBoards = {};
    for (const player of game.players) {
        if (player.isActive && player.socketId && game.boards[player.id]) {
            activeBoards[player.id] = game.boards[player.id];
        }
    }
    return activeBoards;
};

// Socket.IO connection handling
io.on('connection', (socket) => {
    // Create a new game room
    socket.on('create_game_room', async ({ gameId, roomId, userId }) => {
        if (!gameRooms[roomId]) {
            gameRooms[roomId] = {
                gameId,
                boards: {},
                playerColors: {},
                selectedCells: {},
                cingoCount: {},
                turn: null,
                started: false,
                winner: null,
                players: [],
                currentNumber: 1,
                drawnNumbers: [],
                isDrawing: false,
            };
        }
        socket.join(roomId);
        const userResult = await db.query('SELECT id, name, avatar_url FROM users WHERE id = $1', [userId]);
        const username = userResult.rows[0]?.name || socket.username || 'Anonymous';
        const avatarUrl = userResult.rows[0]?.avatar_url || null;
        gameRooms[roomId].players.push({ id: userId, name: username, socketId: socket.id, avatar_url: avatarUrl });
        gameRooms[roomId].boards[userId] = generateRandomBoard();
        gameRooms[roomId].playerColors[userId] = getRandomColor();
        gameRooms[roomId].cingoCount[userId] = 0;
        if (!gameRooms[roomId].selectedCells[userId]) gameRooms[roomId].selectedCells[userId] = [];
        playerSockets[userId] = socket.id;
        io.to(roomId).emit('player_joined', { playerName: username });
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
            allBoards: gameRooms[roomId].boards,
            allSelectedCells: gameRooms[roomId].selectedCells,
        });
    });

    // Join an existing game
    socket.on('join_game', async ({ gameName, id, userId }) => {
        try {
            socket.join(id);
            const userResult = await db.query('SELECT id, name, avatar_url FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                socket.emit('error', { message: 'User not found.' });
                return;
            }
            const username = userResult.rows[0].name || 'Anonymous';
            const avatarUrl = userResult.rows[0]?.avatar_url || null;

            if (!gameRooms[id]) {
                const playersResult = await db.query(
                    'SELECT u.id, u.name, u.avatar_url FROM lobby_players lp JOIN users u ON lp.user_id = u.id WHERE lp.lobby_id = $1',
                    [id]
                );
                const players = playersResult.rows.map(p => ({
                    id: p.id,
                    name: p.name,
                    socketId: null,
                    avatar_url: p.avatar_url,
                    isActive: false
                }));
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
                    isDrawing: false,
                };
                for (const player of players) {
                    gameRooms[id].boards[player.id] = generateRandomBoard();
                    gameRooms[id].playerColors[player.id] = getRandomColor();
                    gameRooms[id].cingoCount[player.id] = 0;
                    gameRooms[id].selectedCells[player.id] = [];
                }
            }

            const existingPlayer = gameRooms[id].players.find(p => p.id === userId);
            if (existingPlayer) {
                existingPlayer.socketId = socket.id;
                existingPlayer.isActive = true;
            }

            if (!gameRooms[id].boards[userId]) {
                gameRooms[id].boards[userId] = generateRandomBoard();
                gameRooms[id].playerColors[userId] = getRandomColor();
                gameRooms[id].cingoCount[userId] = 0;
                gameRooms[id].selectedCells[userId] = [];
            }

            playerSockets[userId] = socket.id;
            const board = gameRooms[id].boards[userId];
            const filteredBoards = filterActiveBoards(gameRooms[id]);
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
                allBoards: filteredBoards,
                allSelectedCells: gameRooms[id].selectedCells,
                allPlayerColors: gameRooms[id].playerColors,
            });
        } catch (err) {
            console.error('Server: Error in join_game:', err);
            socket.emit('error', { message: 'An error occurred while loading the game.' });
        }
    });

    // Start a game
    socket.on('start_game', ({ gameName, id, userId }) => {
        if (!gameRooms[id]) {
            socket.emit('error', { message: 'Game room not found.' });
            return;
        }

        for (const player of gameRooms[id].players) {
            const board = gameRooms[id].boards[player.id];
            if (!board || !Array.isArray(board) || board.every(cell => cell === null)) {
                gameRooms[id].boards[player.id] = generateRandomBoard();
            }
            player.isActive = player.id === userId || (player.socketId && io.sockets.sockets.get(player.socketId) !== undefined);
        }

        gameRooms[id].started = true;
        gameRooms[id].turn = gameRooms[id].players.find(p => p.id === userId)?.name || 'Anonymous';

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
                    allBoards: filterActiveBoards(gameRooms[id]),
                    allSelectedCells: gameRooms[id].selectedCells,
                    allPlayerColors: gameRooms[id].playerColors,
                });
            }
        }
    });

    // Handle drawing a number in the game
    socket.on('draw_number', ({ id, userId }) => {
        const game = gameRooms[id];
        if (!game) {
            socket.emit('error', { message: 'Oyun odası bulunamadı.' });
            return;
        }

        if (!game.started || game.winner) {
            socket.emit('error', { message: 'Oyun başlamadı veya bitti.' });
            return;
        }

        if (game.isDrawing) {
            socket.emit('error', { message: 'Bir çekim işlemi zaten devam ediyor.' });
            return;
        }

        const currentPlayer = game.players.find(p => p.id === parseInt(userId));
        if (!currentPlayer || game.turn !== currentPlayer.name || !currentPlayer.isActive) {
            socket.emit('error', { message: 'Sıra sende değil veya aktif değilsin.' });
            return;
        }

        game.isDrawing = true;

        if (game.drawnNumbers.length >= 90) {
            game.winner = 'Berabere';
            io.to(id).emit('game_won', { winner: 'Berabere' });
            game.isDrawing = false;
            return;
        }

        let number;
        do {
            number = Math.floor(Math.random() * 90) + 1;
        } while (game.drawnNumbers.includes(number));
        game.drawnNumbers.push(number);
        game.currentNumber = number;

        const activePlayers = game.players.filter(p => p.isActive && p.socketId);

        if (activePlayers.length > 1) {
            const currentPlayerIndex = activePlayers.findIndex(p => p.id === parseInt(userId));
            if (currentPlayerIndex === -1) {
                socket.emit('error', { message: 'Could not found an active player.' });
                return;
            }
            const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
            game.turn = activePlayers[nextPlayerIndex]?.name || activePlayers[0]?.name;
        } else if (activePlayers.length === 1) {
            game.turn = activePlayers[0]?.name;
        } else {
            console.error(`draw_number: Aktif oyuncu yok, id: ${id}`);
            game.isDrawing = false;
            socket.emit('error', { message: 'Aktif oyuncu bulunamadı.' });
            return;
        }

        io.to(id).emit('draw_number', { number, drawnNumbers: game.drawnNumbers });

        const filteredBoards = filterActiveBoards(game);
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
                    allBoards: filteredBoards,
                    allSelectedCells: game.selectedCells,
                    allPlayerColors: game.playerColors,
                });
            }
        }

        game.isDrawing = false;
    });

    // Handle player moves
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

        if (!game.selectedCells[userId]) game.selectedCells[userId] = [];

        const row = parseInt(cellId[0], 10);
        const col = parseInt(cellId[1], 10);
        const index = row * 9 + col;
        const playerBoard = game.boards[userId];

        if (index >= 0 && index < 27 && playerBoard[index] !== null && playerBoard[index] !== undefined) {
            const boardValue = playerBoard[index];
            if (!game.selectedCells[userId].includes(cellId) && game.drawnNumbers.includes(boardValue)) {
                game.selectedCells[userId].push(cellId);
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
                    allBoards: filterActiveBoards(game),
                    allSelectedCells: game.selectedCells,
                    allPlayerColors: game.playerColors,
                });
                socket.to(id).emit('game_state', {
                    players: game.players,
                    turn: game.turn,
                    started: game.started,
                    winner: game.winner,
                    currentNumber: game.currentNumber,
                    drawnNumbers: game.drawnNumbers,
                    allBoards: filterActiveBoards(game),
                    allSelectedCells: game.selectedCells,
                    allPlayerColors: game.playerColors,
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

        const selectedCells = game.selectedCells[userId] || [];
        let patternCount = 0;
        const boardNumbers = game.boards[userId];

        for (let row = 0; row < 3; row++) {
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

            const isCingo = validCells.length === 5 && validCells.every(cellId => selectedCells.includes(cellId));

            if (isCingo) {
                patternCount++;
            }
        }

        if (patternCount > game.cingoCount[userId]) {
            game.cingoCount[userId] = patternCount;
            io.to(id).emit('cingo_updated', { userId, cingoCount: game.cingoCount[userId] });
            socket.to(id).emit('cingo_notification', { userId, cingoCount: game.cingoCount[userId], playerName: player.name });

            if (game.cingoCount[userId] >= 3) {
                game.winner = player.name;
                io.to(id).emit('game_won', { winner: player.name });
            }
        }
    });

    // Reset the game
    socket.on('reset_game', ({ id }) => {
        if (gameRooms[id]) {
            const newBoards = {};
            const newPlayerColors = {};
            const newCingoCount = {};
            gameRooms[id].players.forEach(player => {
                newBoards[player.id] = generateRandomBoard();
                newPlayerColors[player.id] = getRandomColor();
                newCingoCount[player.id] = 0;
                player.isActive = false;
            });
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
                        allBoards: filterActiveBoards(gameRooms[id]),
                        allSelectedCells: gameRooms[id].selectedCells,
                        allPlayerColors: gameRooms[id].playerColors,
                    });
                }
            }
        }
    });

    // Set username for the socket
    socket.on('set_username', (username) => {
        socket.username = username;
    });

    // Send a global message
    socket.on('sendMessage', (content) => {
        io.emit('newMessage', {
            username: socket.username || 'Anonymous',
            content,
            timestamp: new Date().toISOString(),
        });
    });

    // Join a lobby
    socket.on('join_lobby', async ({ lobbyId, userId, silent }) => {
        socket.join(lobbyId);
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
            io.to(lobbyId).emit('receive_message', joinMessage);
            io.to(lobbyId).emit('lobby_joined', { userId });
        }
    });

    // Send a message in a lobby
    socket.on('send_message', async ({ lobbyId, userId, content }) => {
        const message = {
            user: socket.username || 'Anonymous',
            content,
            timestamp: new Date().toISOString(),
        };
        try {
            await db.query('INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)', [lobbyId, userId, content]);
            io.to(lobbyId).emit('receive_message', message);
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    // Leave a lobby
    socket.on('leave_lobby', async ({ lobbyId, userId }) => {
        socket.leave(lobbyId);
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
                io.to(lobbyId).emit('receive_message', leaveMessage);
            }
        } catch (err) {
            console.error('Error handling leave_lobby:', err);
        }
    });

    // Send a lobby invitation
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

    // Handle accepted lobby invitation
    socket.on('lobby_invite_accepted', async ({ lobbyId, receiverId, lobbyName }) => {
        try {
            socket.to(lobbyId).emit('lobby_joined', { userId: receiverId });
        } catch (err) {
            console.error('Error emitting lobby invite accepted:', err);
        }
    });

    // Handle rejected lobby invitation
    socket.on('lobby_invite_rejected', async ({ lobbyId, receiverId, lobbyName, receiverName }) => {
        try {
            socket.to(lobbyId).emit('lobby_invite_rejected', { receiverId, receiverName, lobbyName });
        } catch (err) {
            console.error('Error emitting lobby invite rejected:', err);
        }
    });

    // Send a game invitation
    socket.on('game_invite', async ({ lobbyId, userId, invitedUserId }) => {
        try {
            await db.query('INSERT INTO notifications (user_id, type, content) VALUES ($1, \'game_invite\', $2)', [invitedUserId, JSON.stringify({ lobbyId, senderId: userId })]);
            socket.to(invitedUserId).emit('game_invite', { lobbyId, senderId: userId });
        } catch (err) {
            console.error('Error sending invite:', err);
        }
    });

    // Send a friend request
    socket.on('friend_request', async ({ senderId, receiverId }) => {
        socket.to(receiverId).emit('friend_request', { senderId });
    });

    // Handle accepted friend request
    socket.on('friend_accepted', async ({ senderId, receiverId }) => {
        socket.to(senderId).emit('friend_accepted', { receiverId });
    });

    // Notify turn-based game action
    socket.on('turn_based', async ({ gameId, userId }) => {
        socket.to(userId).emit('turn_based', { gameId });
    });

    // Handle friend removal
    socket.on('friend_removed', async ({ userId, friendId }) => {
        socket.to(friendId).emit('friend_removed', { userId });
    });

    // Notify event start
    socket.on('event_started', async ({ lobbyId }) => {
        socket.to(lobbyId).emit('event_started', { lobbyId });
    });

    // Handle player leaving a game
    socket.on('leave_game', ({ id, userId }) => {
        handlePlayerLeave(userId, socket.id, id);
        socket.leave(id);
    });

    // Handle socket disconnection
    socket.on('disconnect', () => {
        const userId = Object.keys(playerSockets).find(key => playerSockets[key] === socket.id);
        if (userId) {
            handlePlayerLeave(userId, socket.id);
        }
    });

    // Handle player leave logic
    const handlePlayerLeave = (userId, socketId, gameId = null) => {
        let game;
        if (gameId) {
            game = gameRooms[gameId];
        } else {
            game = Object.values(gameRooms).find(g => g.players.some(p => p.id === parseInt(userId)));
        }

        if (!game) {
            return;
        }

        const player = game.players.find(p => p.id === parseInt(userId));
        if (!player) {
            return;
        }

        player.isActive = false;
        player.socketId = null;

        const activePlayers = game.players.filter(p => p.isActive && p.socketId);

        if (game.turn === player.name && activePlayers.length > 0) {
            game.turn = activePlayers[0].name;
        } else if (activePlayers.length === 0) {
            game.started = false;
            game.turn = null;
            game.winner = null;
            game.drawnNumbers = [];
            game.currentNumber = 1;
            game.isDrawing = false;
            delete gameRooms[gameId];
        }

        const filteredBoards = filterActiveBoards(game);
        const roomId = gameId || Object.keys(gameRooms).find(key => gameRooms[key] === game);
        for (const p of game.players) {
            if (p.socketId) {
                io.to(p.socketId).emit('game_state', {
                    board: game.boards[p.id] || Array(27).fill(null),
                    playerColor: game.playerColors[p.id] || 'blue',
                    selectedCells: game.selectedCells[p.id] || [],
                    cingoCount: game.cingoCount[p.id] || 0,
                    players: game.players,
                    turn: game.turn,
                    started: game.started,
                    winner: game.winner,
                    currentNumber: game.currentNumber,
                    drawnNumbers: game.drawnNumbers,
                    allBoards: filteredBoards,
                    allSelectedCells: game.selectedCells,
                    allPlayerColors: game.playerColors,
                });
            }
        }
        io.to(roomId).emit('player_left', { playerName: player.name });
    };
});

const PORT = 8081;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));