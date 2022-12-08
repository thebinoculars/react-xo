import React from 'react'
import io from 'socket.io-client'
import './App.css'

const setting = {
  row: 40,
  col: 40,
  win: 5,
}

const HOST = 1
const GUEST = 2

export default class Main extends React.Component {
  constructor() {
    super()
    this.state = {
      check: [],
      chess: [...Array(setting.row)].map(() => [...Array(setting.col)].map(() => null)),
      name: '',
      player: null,
      room: null,
      socket: io(),
      start: false,
      turn: HOST,
      wait: false,
      winner: null,
    }
  }

  componentDidMount() {
    const { socket } = this.state

    // a player join the room
    socket.on('join', (data) => {
      const { player } = this.state
      if (!player) this.setState({ player: data.player })
    })

    // game start
    socket.on('start', () => {
      this.setState({ start: true })
    })

    // game pending
    socket.on('wait', (data) => {
      this.setState({ wait: data.wait })
    })

    // a player tick
    socket.on('play', (data) => {
      this.action(data.row, data.col)
      socket.emit('turn', {
        room: data.room,
        turn: data.turn === HOST ? GUEST : HOST,
      })
    })

    // switch player turn
    socket.on('turn', (data) => {
      this.setState({ turn: data.turn })
    })
  }

  play(row, col, e) {
    e.preventDefault()
    const {
      socket, start, player, turn, room,
    } = this.state
    if (start && player === turn) {
      socket.emit('play', {
        room, row, col, turn,
      })
    }
  }

  action(r, c) {
    const {
      chess, turn, player, winner,
    } = this.state
    // skip on game end or turn player
    if (winner || chess[r][c]) return
    chess[r][c] = turn === player ? player : turn
    this.setState({ chess })
    const moves = [
      { r: 1, c: 1 },
      { r: 1, c: -1 },
      { r: 1, c: 0 },
      { r: 0, c: 1 },
    ]
    let check = []
    moves.forEach((item) => {
      let move = item
      let count = 0
      const list = []
      let temp = []
      // generate row list
      for (let i = 0; i <= setting.row; i += 1) {
        const step = count !== i ? count : i
        count += 1
        const row = r + move.r * step
        const col = c + move.c * step
        if (row < setting.row && row >= 0 && col < setting.col && col >= 0) {
          if (!list.find((l) => l[0] === row && l[1] === col)) list.push([row, col])
        } else {
          move = { r: move.r * -1, c: move.c * -1 }
          count = 1
        }
      }
      // check if X items in a row
      list.sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]))
      const res = list.reduce((prev, cur) => {
        const row = cur[0]
        const col = cur[1]
        if (prev === setting.win) return prev
        if (chess[row][col] === chess[r][c]) {
          temp.push([row, col])
        } else {
          temp = []
        }
        return chess[row][col] === chess[r][c] ? prev + 1 : 0
      }, 0)
      if (res === setting.win) {
        check = temp
        this.setState({ winner: turn })
      }
    })
    this.setState({ check })
  }

  joinGame() {
    const { socket, name } = this.state
    this.setState({ room: name })
    socket.emit('join', { room: name })
  }

  changeRoomName(e) {
    const name = e.target.value
    if (name) this.setState({ name })
  }

  newGame(e) {
    e.preventDefault()
    const { room, socket, wait } = this.state
    this.setState({
      chess: [...Array(setting.row)].map(() => [...Array(setting.col)].map(() => null)),
      check: [],
      start: false,
      winner: null,
    })
    socket.emit('wait', { wait: !wait, room })
  }

  render() {
    const {
      chess, check, name, room, start, player, turn, winner,
    } = this.state
    if (!room) {
      return (
        <div className="main">
          <div className="inner">
            <input type="text" className="input" placeholder="Enter your room name" value={name} onChange={(e) => this.changeRoomName(e)} />
            <button className="submit" type="button" onClick={() => this.joinGame()}>Join game</button>
          </div>
        </div>
      )
    }
    if (!start) return <h1 className="waiting">Waiting Player...</h1>
    return (
      <>
        {
          !!winner || (
            <h1 className={player === turn ? 'waiting' : ''}>
              <span>{`${name} - `}</span>
              <span>{player === turn ? 'Your Turn' : 'Opponent Turn'}</span>
            </h1>
          )
        }
        {
          !!winner && (
            <>
              <h1>
                <span>{winner === player ? 'You Win - ' : 'You Lose - '}</span>
                <a className="waiting" href="/" type="button" onClick={(e) => this.newGame(e)}>New Game</a>
              </h1>
            </>
          )
        }
        <div className="board">
          {
            chess.map((rowData, row) => (
              <div className="row" key={row.toString()}>
                {
                  rowData.map((colData, col) => {
                    let colClass = 'col'
                    let cellClass = 'cell'
                    if (check.find((item) => item.length && item[0] === row && item[1] === col)) {
                      colClass += ' win'
                    }
                    if (colData) {
                      colClass += colData === HOST ? ' colCross' : ' colCircle'
                      cellClass += colData === HOST ? ' cellCross' : ' cellCircle'
                    } else if (!winner && player === turn) {
                      colClass += player === HOST ? ' colEmptyCross' : ' colEmptyCircle'
                    }
                    return (
                      <a href="/" className={colClass} key={col.toString()} onClick={(e) => this.play(row, col, e)}>
                        <div className={cellClass}>{`${row}:${col}`}</div>
                      </a>
                    )
                  })
                }
              </div>
            ))
          }
        </div>
      </>
    )
  }
}
