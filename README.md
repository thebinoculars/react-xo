# Caro Game

A real-time multiplayer Caro (Gomoku) game built with React, TypeScript, Socket.IO, and Tailwind CSS.

## Features

- 🎮 Real-time multiplayer gameplay
- 💬 In-game chat
- ⏱️ Turn timer (30 seconds per turn)
- 🔄 Play again option with countdown
- 🏆 Win detection with highlighted winning cells
- 🎨 Dark theme UI

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, Socket.IO
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start both frontend and backend:

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`
Backend runs on `http://localhost:5000`

### Production Build

```bash
npm run build
npm start
```

## How to Play

1. Create or join a room
2. Share the room code with a friend
3. Take turns placing X or O on the board
4. First to get 5 in a row wins!
5. You have 30 seconds per turn - don't run out of time!

## Project Structure

```
react-caro/
├── src/              # Frontend source
├── public/           # Static assets
├── server.ts         # Backend server
├── index.html        # HTML entry
└── vite.config.ts    # Vite config
```

## License

MIT
