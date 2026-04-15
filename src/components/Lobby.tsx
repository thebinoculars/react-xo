import React, { useState } from 'react';

interface LobbyProps {
  onCreateRoom: (password?: string) => void;
  onJoinRoom: (roomId: string, password?: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomPassword, setRoomPassword] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-effect rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-dark-text mb-2">Caro Game</h1>
          <p className="text-dark-text/50">Real-time multiplayer tic-tac-toe</p>
        </div>
        <div className="flex bg-dark-bg rounded-xl p-1 mb-8">
          <button className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'create' ? 'bg-dark-cell text-player-x shadow-md' : 'text-dark-text/60 hover:text-dark-text'}`} onClick={() => setActiveTab('create')}>Create Room</button>
          <button className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'join' ? 'bg-dark-cell text-player-o shadow-md' : 'text-dark-text/60 hover:text-dark-text'}`} onClick={() => setActiveTab('join')}>Join Room</button>
        </div>
        {activeTab === 'create' ? (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-dark-text">Create New Room</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} className="w-5 h-5 rounded border-dark-cell bg-dark-bg text-player-x focus:ring-player-x" />
              <span className="text-dark-text/80 font-medium">Add password protection</span>
            </label>
            {usePassword && <input type="password" placeholder="Enter room password" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} className="w-full px-4 py-3 bg-dark-bg border border-dark-cell rounded-xl focus:ring-2 focus:ring-player-x focus:border-transparent text-dark-text placeholder:text-dark-text/40" />}
            <button onClick={() => onCreateRoom(usePassword ? roomPassword : undefined)} className="w-full bg-dark-btn text-white py-3 px-6 rounded-xl font-semibold hover:bg-dark-btn-hover transform hover:scale-105 transition-all shadow-lg">Create Room</button>
          </div>
        ) : (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-dark-text">Join Existing Room</h2>
            <input type="text" placeholder="Enter room ID" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} className="w-full px-4 py-3 bg-dark-bg border border-dark-cell rounded-xl focus:ring-2 focus:ring-player-x focus:border-transparent text-dark-text placeholder:text-dark-text/40" />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} className="w-5 h-5 rounded border-dark-cell bg-dark-bg text-player-x focus:ring-player-x" />
              <span className="text-dark-text/80 font-medium">Room has password</span>
            </label>
            {usePassword && <input type="password" placeholder="Enter room password" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} className="w-full px-4 py-3 bg-dark-bg border border-dark-cell rounded-xl focus:ring-2 focus:ring-player-x focus:border-transparent text-dark-text placeholder:text-dark-text/40" />}
            <button onClick={() => onJoinRoom(joinRoomId, usePassword ? joinPassword : undefined)} className="w-full bg-dark-btn text-white py-3 px-6 rounded-xl font-semibold hover:bg-dark-btn-hover transform hover:scale-105 transition-all shadow-lg">Join Room</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;
