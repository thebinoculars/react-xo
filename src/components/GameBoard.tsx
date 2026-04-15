import React, { useState, useRef, useEffect } from 'react';
import Toast from './Toast';

interface Player { id: string; name: string; symbol: 'X' | 'O'; }
interface GameState { board: (string | null)[][]; currentPlayer: 'X' | 'O'; gameStarted: boolean; gameEnded: boolean; winner: string | null; winningCells: [number, number][] | null; players: Player[]; roomId?: string; }
interface PlayAgainStatus { readyCount: number; totalPlayers: number; readyPlayers: string[]; }
interface ChatMessage { playerId: string; playerName: string; playerSymbol: 'X' | 'O'; message: string; timestamp: number; }
interface GameBoardProps { gameState: GameState; player: Player | null; onMakeMove: (row: number, col: number) => void; onPlayAgain: () => void; onLeaveRoom: () => void; playAgainStatus: PlayAgainStatus | null; currentRoom: string; chatMessages: ChatMessage[]; onSendMessage: (message: string) => void; turnTimeLeft: number; playAgainTimeLeft: number; }

const GameBoard: React.FC<GameBoardProps> = ({ gameState, player, onMakeMove, onPlayAgain, onLeaveRoom, playAgainStatus, currentRoom, chatMessages, onSendMessage, turnTimeLeft, playAgainTimeLeft }) => {
  const [hoveredCell, setHoveredCell] = useState<{row: number, col: number} | null>(null);
  const [viewportPosition, setViewportPosition] = useState({ row: 0, col: 0 });
  const [chatInput, setChatInput] = useState('');
  const [showToast, setShowToast] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const boardSize = 128, cellSize = 30, viewportSize = 25;
  
  useEffect(() => {
    if (gameState.gameEnded && gameState.winner) {
      setShowToast(true);
    }
    if (gameState.gameStarted && !gameState.gameEnded) {
      setShowToast(false);
    }
  }, [gameState.gameEnded, gameState.gameStarted, gameState.winner]);
  
  const isWin = gameState.winner === player?.symbol;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCellClick = (row: number, col: number) => {
    if (!gameState.gameEnded && gameState.board[row][col] === null && player?.symbol === gameState.currentPlayer) onMakeMove(row, col);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / cellSize);
    const row = Math.floor((e.clientY - rect.top) / cellSize);
    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) setHoveredCell({ row, col });
  };

  const handleScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const s = 3;
    setViewportPosition(p => ({
      row: Math.max(0, Math.min(boardSize - viewportSize, p.row + (e.deltaY > 0 ? s : -s))),
      col: Math.max(0, Math.min(boardSize - viewportSize, p.col + (e.deltaX > 0 ? s : -s)))
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const s = 5;
    setViewportPosition(p => {
      let r = p.row, c = p.col;
      if (e.key === 'ArrowUp') r = Math.max(0, r - s);
      if (e.key === 'ArrowDown') r = Math.min(boardSize - viewportSize, r + s);
      if (e.key === 'ArrowLeft') c = Math.max(0, c - s);
      if (e.key === 'ArrowRight') c = Math.min(boardSize - viewportSize, c + s);
      return { row: r, col: c };
    });
  };

  const isMyTurn = player?.symbol === gameState.currentPlayer && !gameState.gameEnded && gameState.gameStarted;

  const renderBoard = () => {
    const cells = [];
    const sr = viewportPosition.row, er = Math.min(sr + viewportSize, boardSize);
    const sc = viewportPosition.col, ec = Math.min(sc + viewportSize, boardSize);
    for (let row = sr; row < er; row++) {
      for (let col = sc; col < ec; col++) {
        const v = gameState.board[row][col];
        const isH = hoveredCell?.row === row && hoveredCell?.col === col;
        const canP = !gameState.gameEnded && v === null && isMyTurn;
        const isForbidden = isH && !canP && !v && !gameState.gameEnded;
        const playerHoverClass = player?.symbol === 'X' ? 'hovered-x' : 'hovered-o';
        // Check if this cell is a winning cell
        const isWinningCell = gameState.winningCells?.some(([r, c]) => r === row && c === col);
        
        cells.push(
          <div key={`${row}-${col}`} 
            className={`cell ${v ? 'filled' : ''} ${isH && canP ? playerHoverClass : ''} ${isForbidden ? 'forbidden' : ''} ${isWinningCell ? 'winning-cell' : ''}`}
            style={{ 
              left: `${(col - sc) * cellSize}px`, 
              top: `${(row - sr) * cellSize}px`, 
              width: `${cellSize}px`, 
              height: `${cellSize}px`,
              cursor: isForbidden ? 'not-allowed' : (canP ? 'pointer' : 'default'),
              zIndex: isWinningCell ? 10 : 1
            }}
            onClick={() => handleCellClick(row, col)}>
            {v && <span className={`cell-content ${v === 'X' ? 'text-player-x' : 'text-player-o'}`}>{v}</span>}
            {isH && canP && !v && <span className={`cell-preview ${player?.symbol === 'X' ? 'text-player-x' : 'text-player-o'}`}>{player?.symbol}</span>}
          </div>
        );
      }
    }
    return cells;
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(currentRoom);
  };

  return (
    <div className="min-h-screen p-2 md:p-4 flex items-center justify-center">
      <Toast show={showToast} onClose={() => setShowToast(false)}>
        <div className={`px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce cursor-pointer ${isWin ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isWin ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            )}
          </svg>
          <span className="font-bold">{isWin ? '🎉 You Win!' : '😢 You Lose!'}</span>
        </div>
      </Toast>
      {/* Main Layout: Left (Info) | Center (Board) | Right (Chat) */}
      <div className="flex flex-col xl:flex-row gap-4 md:gap-6 max-w-full mx-auto items-stretch w-full">
        
        {/* LEFT: Info Panel */}
        <div className="w-full xl:w-80 flex-shrink-0 order-2 xl:order-1">
          <div className="glass-effect rounded-2xl p-3 shadow-xl flex flex-col">

            {/* Room Code Header with Copy */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-dark-cell">
              <div className="flex items-center gap-2">
                <span className="text-xs text-dark-text/60">Room:</span>
                <span className="font-mono font-bold text-dark-text text-sm">{currentRoom}</span>
              </div>
              <button 
                onClick={copyRoomCode}
                className="p-1 rounded bg-dark-cell hover:bg-dark-bg text-dark-text transition-colors"
                title="Copy room code"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>

            {/* Players */}
            <div className="space-y-2 mb-3">
              <h4 className="text-xs font-semibold text-dark-text/50 uppercase tracking-wide">Players</h4>
              {gameState.players.map(p => {
                const isCurrentTurn = p.symbol === gameState.currentPlayer && !gameState.gameEnded;
                const isMe = p.id === player?.id;
                return (
                  <div key={p.id} className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${isCurrentTurn ? 'bg-dark-cell border-2 border-player-x scale-[1.02]' : 'bg-dark-bg/50 border border-dark-cell'}`}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base flex-shrink-0 ${p.symbol === 'X' ? 'bg-player-x/20 text-player-x' : 'bg-player-o/20 text-player-o'}`}>{p.symbol}</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-medium text-dark-text text-sm truncate max-w-[80px] ${isMe ? 'text-player-x' : ''}`}>{p.name}</span>
                        {isMe && <span className="text-[10px] font-bold text-player-x bg-player-x/20 px-1 py-0.5 rounded flex-shrink-0">YOU</span>}
                      </div>
                    </div>
                    {isCurrentTurn && (
                      <div className="flex items-center gap-1">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-player-x opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-player-x"></span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {gameState.players.length < 2 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-bg/50 border border-dashed border-dark-cell">
                  <div className="w-8 h-8 rounded-lg bg-dark-cell animate-pulse" />
                  <span className="text-dark-text/50 text-sm">Waiting...</span>
                </div>
              )}
            </div>

            {/* Status Section */}
            <div className="border-t border-dark-cell pt-3 flex-1">
              {!gameState.gameStarted ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-player-o">
                    <div className="w-3.5 h-3.5 border-2 border-player-o border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium">Waiting for opponent</span>
                  </div>
                </div>
              ) : gameState.gameEnded ? (
                <div className="space-y-2">
                  <div className="text-center">
                    <h4 className="text-lg font-bold text-player-x">Game Over!</h4>
                    {gameState.winner ? (
                      <p className={`text-sm font-bold ${gameState.winner === 'X' ? 'text-player-x' : 'text-player-o'}`}>
                        {gameState.players.find(p => p.symbol === gameState.winner)?.name} wins!
                      </p>
                    ) : <p className="text-dark-text/60 text-sm">Draw!</p>}
                  </div>
                  {/* Play Again Timer */}
                  <div className={`text-center py-2 rounded-lg ${playAgainTimeLeft <= 10 ? 'bg-player-o/20 animate-pulse' : 'bg-dark-cell'}`}>
                    <p className="text-xs text-dark-text/60">Time to play again</p>
                    <p className={`text-lg font-bold ${playAgainTimeLeft <= 10 ? 'text-player-o' : 'text-dark-text'}`}>{playAgainTimeLeft}s</p>
                  </div>
                  {playAgainStatus && playAgainStatus.readyCount > 0 && (
                    <div className="bg-dark-cell rounded-lg p-1.5 text-xs">
                      <p className="font-medium text-dark-text">{playAgainStatus.readyCount}/{playAgainStatus.totalPlayers} ready</p>
                    </div>
                  )}
                  <button 
                    onClick={onPlayAgain} 
                    disabled={playAgainStatus?.readyPlayers.includes(player?.name || '')}
                    className={`w-full py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                      playAgainStatus?.readyPlayers.includes(player?.name || '')
                        ? 'bg-dark-cell text-dark-text/50 cursor-not-allowed'
                        : 'bg-dark-btn text-white hover:bg-dark-btn-hover'
                    }`}>
                    {playAgainStatus?.readyPlayers.includes(player?.name || '') ? 'Waiting...' : 'Play Again'}
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <h4 className="text-xs font-semibold text-dark-text/50 uppercase tracking-wide">Current Turn</h4>
                  <div className={`text-3xl font-bold ${gameState.currentPlayer === 'X' ? 'text-player-x' : 'text-player-o'}`}>{gameState.currentPlayer}</div>
                  {/* Turn Timer */}
                  <div className={`flex items-center justify-center gap-1 py-1 px-3 rounded-lg ${turnTimeLeft <= 10 ? 'bg-player-o/20 animate-pulse' : 'bg-dark-cell'}`}>
                    <svg className={`w-4 h-4 ${turnTimeLeft <= 10 ? 'text-player-o' : 'text-dark-text/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className={`font-bold ${turnTimeLeft <= 10 ? 'text-player-o' : 'text-dark-text'}`}>{turnTimeLeft}s</span>
                  </div>
                  <p className="text-xs text-dark-text/60">{player?.symbol === gameState.currentPlayer ? 'Your turn!' : 'Opponent thinking...'}</p>
                </div>
              )}
            </div>

            {/* Leave Room Button */}
            <div className="mt-3 pt-3 border-t border-dark-cell">
              <button onClick={onLeaveRoom} className="w-full bg-dark-btn text-white py-2 px-3 rounded-lg font-semibold hover:bg-dark-btn-hover transition-all shadow-md flex items-center justify-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Leave Room
              </button>
            </div>
          </div>
        </div>

        {/* CENTER: Game Board */}
        <div className="w-full xl:flex-1 flex justify-center overflow-x-auto pb-4 order-1 xl:order-2">
          <div className="game-board-bg flex-shrink-0 relative overflow-hidden cursor-crosshair"
            ref={boardRef} onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredCell(null)}
            onWheel={handleScroll} onKeyDown={handleKeyPress} tabIndex={0}
            style={{ width: `${viewportSize * cellSize}px`, height: `${viewportSize * cellSize}px` }}>
            {renderBoard()}
          </div>
        </div>

        {/* RIGHT: Chat Panel */}
        <div className="w-full xl:w-80 flex-shrink-0 order-3 flex flex-col">
          <div className="glass-effect rounded-2xl p-3 shadow-xl flex flex-col border-t-4 border-t-player-x">
            <h3 className="text-sm font-bold text-player-x mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1 1 0 01-1-1v-6a1 1 0 011-1h8a1 1 0 001-1v-2a1 1 0 00-1-1H9a3 3 0 00-3 3v6a3 3 0 003 3h5l4 4v-4h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2" /></svg>
              Chat
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 mb-2 min-h-[280px] max-h-[350px]">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-dark-text/40 text-center py-4 italic">No messages yet. Say hello! 👋</p>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.playerId === player?.id ? 'items-end' : 'items-start'}`}>
                    <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] shadow-sm ${
                      msg.playerId === player?.id 
                        ? 'bg-indigo-600/40 border border-indigo-500/50 rounded-br-none' 
                        : 'bg-slate-600/40 border border-slate-500/30 rounded-bl-none'
                    }`}>
                      <span className={`font-bold text-xs block mb-0.5 ${msg.playerSymbol === 'X' ? 'text-player-x' : 'text-player-o'}`}>
                        {msg.playerName}
                      </span>
                      <p className="leading-relaxed text-slate-100">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  onSendMessage(chatInput);
                  setChatInput('');
                }
              }}
              placeholder="Type a message..."
              className="w-full px-3 py-2 text-sm bg-dark-bg border border-dark-cell rounded-lg focus:outline-none focus:border-slate-500 text-dark-text placeholder:text-dark-text/40"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default GameBoard;
