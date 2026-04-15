import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import './App.css';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import Toast from './components/Toast';

interface Player { id: string; name: string; symbol: 'X' | 'O'; }
interface GameState { board: (string | null)[][]; currentPlayer: 'X' | 'O'; gameStarted: boolean; gameEnded: boolean; winner: string | null; winningCells: [number, number][] | null; players: Player[]; roomId?: string; }

interface PlayAgainStatus {
  readyCount: number;
  totalPlayers: number;
  readyPlayers: string[];
}

interface ChatMessage {
  playerId: string;
  playerName: string;
  playerSymbol: 'X' | 'O';
  message: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-dismiss error after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  const [playAgainStatus, setPlayAgainStatus] = useState<PlayAgainStatus | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(30);
  const [playAgainTimeLeft, setPlayAgainTimeLeft] = useState<number>(30);

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('joined-room', (data: { player: Player; gameState: GameState }) => {
      setPlayer(data.player);
      setGameState(data.gameState);
      setError(null);
    });

    newSocket.on('player-joined', (data: { player: Player }) => {
      setGameState(prev => prev ? { ...prev, players: [...prev.players, data.player] } : null);
    });

    newSocket.on('player-left', (data: { playerId: string }) => {
      setGameState(prev => prev ? { ...prev, players: prev.players.filter(p => p.id !== data.playerId) } : null);
    });

    newSocket.on('game-started', (data: { currentPlayer: 'X' | 'O'; players: Player[] }) => {
      setGameState(prev => prev ? { ...prev, gameStarted: true, currentPlayer: data.currentPlayer, players: data.players } : null);
    });

    newSocket.on('move-made', (data: { row: number; col: number; player: string; currentPlayer: 'X' | 'O'; gameEnded: boolean; winner: string | null; winningCells: [number, number][] | null }) => {
      setGameState(prev => {
        if (!prev) return null;
        const newBoard = prev.board.map(row => [...row]);
        newBoard[data.row][data.col] = data.player;
        return { ...prev, board: newBoard, currentPlayer: data.currentPlayer, gameEnded: data.gameEnded, winner: data.winner, winningCells: data.winningCells };
      });
    });

    newSocket.on('game-reset', (data: GameState) => {
      setGameState(data);
      setPlayAgainStatus(null);
      setTurnTimeLeft(30);
      setPlayAgainTimeLeft(30);
    });

    newSocket.on('play-again-status', (data: PlayAgainStatus) => {
      setPlayAgainStatus(data);
    });

    newSocket.on('room-deleted', (data: { message: string }) => {
      setError(data.message);
      setCurrentRoom(null);
      setGameState(null);
      setPlayer(null);
      setPlayAgainStatus(null);
      setChatMessages([]);
    });

    newSocket.on('chat-message', (data: ChatMessage) => {
      setChatMessages(prev => [...prev, data]);
    });

    newSocket.on('turn-timer-update', (data: { timeLeft: number }) => {
      setTurnTimeLeft(data.timeLeft);
    });

    newSocket.on('play-again-timer-update', (data: { timeLeft: number }) => {
      setPlayAgainTimeLeft(data.timeLeft);
    });

    newSocket.on('turn-timeout', (data: { loser: string; winner: string; message: string }) => {
      setError(data.message);
      setGameState(prev => prev ? { ...prev, gameEnded: true, winner: data.winner } : null);
      setTurnTimeLeft(0);
    });

    newSocket.on('room-closed', (data: { message: string }) => {
      setError(data.message);
      setCurrentRoom(null);
      setGameState(null);
      setPlayer(null);
      setPlayAgainStatus(null);
      setChatMessages([]);
    });

    newSocket.on('error', (data: { message: string }) => {
      setError(data.message);
    });

    return () => { newSocket.close(); };
  }, []);

  const handleCreateRoom = async (password?: string) => {
    try {
      const response = await fetch(`${window.location.origin}/api/create-room`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const data = await response.json();
      setCurrentRoom(data.roomId);
    } catch { setError('Failed to create room'); }
  };

  const handleJoinRoom = async (roomId: string, password?: string) => {
    try {
      const response = await fetch(`${window.location.origin}/api/join-room`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, password }) });
      if (!response.ok) { const e = await response.json(); setError(e.error); return; }
      setCurrentRoom(roomId);
    } catch { setError('Failed to join room'); }
  };

  const handleJoinSocketRoom = (playerName: string) => {
    if (socket && currentRoom) socket.emit('join-room', { roomId: currentRoom, playerName });
  };

  const handleMakeMove = (row: number, col: number) => {
    if (socket && currentRoom) socket.emit('make-move', { row, col });
  };

  const handlePlayAgain = () => {
    if (socket && currentRoom) {
      socket.emit('play-again');
      // Optimistically update UI
      setPlayAgainStatus(prev => prev ? { ...prev, readyCount: prev.readyCount + 1, readyPlayers: [...prev.readyPlayers, player?.name || 'You'] } : { readyCount: 1, totalPlayers: 2, readyPlayers: [player?.name || 'You'] });
    }
  };

  const handleLeaveRoom = () => {
    if (socket && currentRoom) { socket.emit('leave-room'); setCurrentRoom(null); setGameState(null); setPlayer(null); setPlayAgainStatus(null); setChatMessages([]); }
  };

  const handleSendMessage = (message: string) => {
    if (socket && currentRoom && message.trim()) {
      socket.emit('chat-message', { message: message.trim() });
    }
  };

  const handleClearError = () => setError(null);

  const handleJoinGameClick = () => {
    const input = document.getElementById('player-name-input') as HTMLInputElement;
    if (input?.value.trim()) handleJoinSocketRoom(input.value.trim());
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      <Toast show={!!error} onClose={handleClearError}>
        <div className="px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce cursor-pointer bg-player-o/90 text-white">
          <span className="font-medium">{error}</span>
          <span className="hover:text-dark-text/70">&times;</span>
        </div>
      </Toast>
      {!currentRoom ? (
        <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
      ) : !gameState ? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass-effect rounded-3xl shadow-2xl p-8 w-full max-w-md text-center space-y-6">
            <h2 className="text-2xl font-bold text-dark-text">Enter Your Name</h2>
            <div className="bg-dark-cell rounded-xl p-4">
              <p className="text-dark-text/60 mb-1">Room code:</p>
              <p className="text-3xl font-bold font-mono text-dark-text">{currentRoom}</p>
            </div>
            <div className="space-y-3">
              <input type="text" id="player-name-input" placeholder="Enter your name" autoComplete="off" maxLength={20} className="w-full px-4 py-3 bg-dark-bg border border-dark-cell rounded-xl focus:ring-2 focus:ring-player-x focus:border-transparent text-center text-dark-text placeholder:text-dark-text/40" />
              <button onClick={handleJoinGameClick} className="w-full bg-dark-btn text-white py-3 px-6 rounded-xl font-semibold hover:bg-dark-btn-hover transform hover:scale-105 transition-all shadow-lg">Join Game</button>
            </div>
            <button onClick={handleLeaveRoom} className="text-dark-text/60 hover:text-player-o transition-colors font-medium">Leave Room</button>
          </div>
        </div>
      ) : (
        <GameBoard gameState={gameState} player={player} onMakeMove={handleMakeMove} onPlayAgain={handlePlayAgain} onLeaveRoom={handleLeaveRoom} playAgainStatus={playAgainStatus} currentRoom={currentRoom} chatMessages={chatMessages} onSendMessage={handleSendMessage} turnTimeLeft={turnTimeLeft} playAgainTimeLeft={playAgainTimeLeft} />
      )}
    </div>
  );
};

export default App;
