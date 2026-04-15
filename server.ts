import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve React static files
app.use(express.static(path.join(__dirname, 'dist')));

// API routes - serve them before the catch-all
app.post('/api/create-room', (req, res) => {
  const { password } = req.body;
  const roomId = uuidv4().substring(0, 8);
  const gameState = new GameState(roomId);
  
  if (password) {
    gameState.password = password;
  }
  
  rooms.set(roomId, gameState);
  res.json({ roomId, hasPassword: !!password });
});

app.post('/api/join-room', (req, res) => {
  const { roomId, password } = req.body;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.password && room.password !== password) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  if (room.players.length >= 2) {
    return res.status(403).json({ error: 'Room is full' });
  }
  
  res.json({ success: true });
});

app.get('/api/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    roomId: room.roomId,
    hasPassword: !!room.password,
    playerCount: room.players.length,
    gameStarted: room.gameStarted,
    gameEnded: room.gameEnded,
    winner: room.winner
  });
});

// Catch-all handler: send back React's index.html for any non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Room management
const rooms = new Map<string, GameState>();

// Game state class
const TURN_TIME_LIMIT = 30; // seconds
const PLAY_AGAIN_TIME_LIMIT = 30; // seconds

class GameState {
  roomId: string;
  board: (string | null)[][];
  currentPlayer: 'X' | 'O';
  players: Player[];
  gameStarted: boolean;
  gameEnded: boolean;
  winner: string | null;
  winningCells: [number, number][] | null;
  password: string | null;
  playAgainRequests: Set<string>;
  firstPlayer: 'X' | 'O';
  turnTimer: NodeJS.Timeout | null;
  turnTimeLeft: number;
  playAgainTimer: NodeJS.Timeout | null;
  playAgainTimeLeft: number;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.board = Array(128).fill(null).map(() => Array(128).fill(null));
    this.currentPlayer = 'X';
    this.players = [];
    this.gameStarted = false;
    this.gameEnded = false;
    this.winner = null;
    this.winningCells = null;
    this.password = null;
    this.playAgainRequests = new Set();
    this.firstPlayer = 'X';
    this.turnTimer = null;
    this.turnTimeLeft = TURN_TIME_LIMIT;
    this.playAgainTimer = null;
    this.playAgainTimeLeft = PLAY_AGAIN_TIME_LIMIT;
  }

  makeMove(row: number, col: number, player: string): boolean {
    if (this.board[row][col] !== null || this.gameEnded) {
      return false;
    }
    
    this.board[row][col] = player;
    
    const winResult = this.checkWin(row, col, player);
    if (winResult.won) {
      this.gameEnded = true;
      this.winner = player;
      this.winningCells = winResult.winningCells || null;
      return true;
    }
    
    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    return true;
  }

  checkWin(row: number, col: number, player: string): { won: boolean; winningCells?: [number, number][] } {
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1]
    ];

    for (const [dx, dy] of directions) {
      const cells: [number, number][] = [[row, col]];
      
      // Check positive direction
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (newRow < 0 || newRow >= 128 || newCol < 0 || newCol >= 128 || 
            this.board[newRow][newCol] !== player) {
          break;
        }
        cells.push([newRow, newCol]);
      }
      
      // Check negative direction
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (newRow < 0 || newRow >= 128 || newCol < 0 || newCol >= 128 || 
            this.board[newRow][newCol] !== player) {
          break;
        }
        cells.push([newRow, newCol]);
      }
      
      if (cells.length >= 5) {
        return { won: true, winningCells: cells };
      }
    }
    
    return { won: false };
  }

  reset(): void {
    this.board = Array(128).fill(null).map(() => Array(128).fill(null));
    // Alternate who goes first
    this.firstPlayer = this.firstPlayer === 'X' ? 'O' : 'X';
    this.currentPlayer = this.firstPlayer;
    this.gameEnded = false;
    this.winner = null;
    this.winningCells = null;
    this.playAgainRequests.clear();
    this.stopTurnTimer();
    this.stopPlayAgainTimer();
    this.turnTimeLeft = TURN_TIME_LIMIT;
    this.playAgainTimeLeft = PLAY_AGAIN_TIME_LIMIT;
  }

  startTurnTimer(io: any): void {
    this.stopTurnTimer();
    this.turnTimeLeft = TURN_TIME_LIMIT;
    io.to(this.roomId).emit('turn-timer-update', { timeLeft: this.turnTimeLeft });
    
    this.turnTimer = setInterval(() => {
      this.turnTimeLeft--;
      io.to(this.roomId).emit('turn-timer-update', { timeLeft: this.turnTimeLeft });
      
      if (this.turnTimeLeft <= 0) {
        this.stopTurnTimer();
        // Current player loses due to timeout
        this.gameEnded = true;
        this.winner = this.currentPlayer === 'X' ? 'O' : 'X';
        io.to(this.roomId).emit('turn-timeout', { 
          loser: this.currentPlayer,
          winner: this.winner,
          message: `${this.currentPlayer} ran out of time!` 
        });
        this.startPlayAgainTimer(io);
      }
    }, 1000);
  }

  stopTurnTimer(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  startPlayAgainTimer(io: any): void {
    this.stopPlayAgainTimer();
    this.playAgainTimeLeft = PLAY_AGAIN_TIME_LIMIT;
    io.to(this.roomId).emit('play-again-timer-update', { timeLeft: this.playAgainTimeLeft });
    
    this.playAgainTimer = setInterval(() => {
      this.playAgainTimeLeft--;
      io.to(this.roomId).emit('play-again-timer-update', { timeLeft: this.playAgainTimeLeft });
      
      if (this.playAgainTimeLeft <= 0) {
        this.stopPlayAgainTimer();
        // Close room - kick everyone out
        io.to(this.roomId).emit('room-closed', { message: 'Play again time expired. Room closed.' });
        rooms.delete(this.roomId);
      }
    }, 1000);
  }

  stopPlayAgainTimer(): void {
    if (this.playAgainTimer) {
      clearInterval(this.playAgainTimer);
      this.playAgainTimer = null;
    }
  }

  switchTurn(io: any): void {
    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    this.startTurnTimer(io);
    io.to(this.roomId).emit('turn-switched', { currentPlayer: this.currentPlayer });
  }
}

interface Player {
  id: string;
  name: string;
  symbol: 'X' | 'O';
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data: { roomId: string; playerName: string }) => {
    const { roomId, playerName } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.players.length >= 2) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    socket.join(roomId);
    
    const player: Player = {
      id: socket.id,
      name: playerName,
      symbol: room.players.length === 0 ? 'X' : 'O'
    };
    
    room.players.push(player);
    (socket as any).playerId = socket.id;
    (socket as any).roomId = roomId;
    
    socket.emit('joined-room', {
      player,
      gameState: {
        board: room.board,
        currentPlayer: room.currentPlayer,
        gameStarted: room.gameStarted,
        gameEnded: room.gameEnded,
        winner: room.winner,
        players: room.players
      }
    });
    
    socket.to(roomId).emit('player-joined', { player });
    
    if (room.players.length === 2 && !room.gameStarted) {
      room.gameStarted = true;
      room.startTurnTimer(io);
      // Emit initial timer value to both players
      io.to(roomId).emit('turn-timer-update', { timeLeft: room.turnTimeLeft });
      io.to(roomId).emit('game-started', {
        currentPlayer: room.currentPlayer,
        players: room.players
      });
    }
  });

  socket.on('make-move', (data: { row: number; col: number }) => {
    const { row, col } = data;
    const roomId = (socket as any).roomId;
    const room = rooms.get(roomId);
    
    if (!room || !room.gameStarted || room.gameEnded) {
      return;
    }
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.symbol !== room.currentPlayer) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    if (room.makeMove(row, col, player.symbol)) {
      // Stop current timer and start new one for next player
      room.stopTurnTimer();
      
      if (room.gameEnded) {
        // Game ended - start play again timer
        room.startPlayAgainTimer(io);
      } else {
        // Continue game - start timer for next player
        room.startTurnTimer(io);
      }
      
      io.to(roomId).emit('move-made', {
        row,
        col,
        player: player.symbol,
        currentPlayer: room.currentPlayer,
        gameEnded: room.gameEnded,
        winner: room.winner,
        winningCells: room.winningCells,
        turnTimeLeft: room.turnTimeLeft
      });
    }
  });

  socket.on('chat-message', (data: { message: string }) => {
    const roomId = (socket as any).roomId;
    const room = rooms.get(roomId);
    
    if (!room) return;
    
    const sender = room.players.find(p => p.id === socket.id);
    if (!sender) return;
    
    // Broadcast message to all players in room
    io.to(roomId).emit('chat-message', {
      playerId: socket.id,
      playerName: sender.name,
      playerSymbol: sender.symbol,
      message: data.message,
      timestamp: Date.now()
    });
  });

  socket.on('play-again', () => {
    const roomId = (socket as any).roomId;
    const room = rooms.get(roomId);
    
    if (!room || room.players.length < 2) {
      return;
    }
    
    // Add this player to play again requests
    room.playAgainRequests.add(socket.id);
    
    // Notify all players about who wants to play again
    io.to(roomId).emit('play-again-status', {
      readyCount: room.playAgainRequests.size,
      totalPlayers: room.players.length,
      readyPlayers: room.players.filter(p => room.playAgainRequests.has(p.id)).map(p => p.name)
    });
    
    // Only reset when both players have requested
    if (room.playAgainRequests.size === 2) {
      room.stopPlayAgainTimer();
      room.reset();
      room.gameStarted = true;
      room.startTurnTimer(io);
      io.to(roomId).emit('game-reset', {
        board: room.board,
        currentPlayer: room.currentPlayer,
        gameStarted: true,
        gameEnded: false,
        winner: null,
        players: room.players
      });
    }
  });

  socket.on('leave-room', () => {
    const roomId = (socket as any).roomId;
    const room = rooms.get(roomId);
    
    if (room) {
      // Notify other player that room is deleted
      socket.to(roomId).emit('room-deleted', { message: 'Other player left. Room closed.' });
      // Delete the room entirely
      rooms.delete(roomId);
    }
    
    socket.leave(roomId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const roomId = (socket as any).roomId;
    const room = rooms.get(roomId);
    
    if (room) {
      // Notify other player that room is deleted
      socket.to(roomId).emit('room-deleted', { message: 'Other player disconnected. Room closed.' });
      // Delete the room entirely
      rooms.delete(roomId);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
