const express = require('express')

const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const cors = require('cors')
const path = require('path')
require('dotenv').config()

app.use(cors())
app.use(express.static('build'))

const PORT = process.env.PORT || 4000

server.listen(PORT)

const HOST = 1
const GUEST = 2

io.on('connection', (socket) => {
  socket.on('join', (data) => {
    const room = io.nsps['/'].adapter.rooms[data.room]
    if (!room) {
      socket.join(data.room)
      io.to(data.room).emit('join', {
        player: HOST
      })
    }
    if (room && room.length === 1) {
      socket.join(data.room)
      io.to(data.room).emit('join', {
        player: GUEST
      })
      io.to(data.room).emit('start')
    }
  })
  socket.on('turn', (data) => {
    io.to(data.room).emit('turn', {
      room: data.room,
      turn: data.turn
    })
  })
  socket.on('play', (data) => {
    io.to(data.room).emit('play', data)
  })
  socket.on('wait', (data) => {
    io.to(data.room).emit('wait', data)
    if (!data.wait) {
      io.to(data.room).emit('start')
    }
  })
})

app.get('/', (req, res) => {
  res.sendFile(path.join(`${__dirname}/build/index.html`))
})
