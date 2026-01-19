import React, { useEffect, useState } from 'react'

import {StatPanelProps, GameStateTypes, IOPanelProps, RestartButtonProps, PlayersResponse, StatsResponse, LineState} from './types'

import {OutcomeMap, PlayerStats, GameStats, XorO, Player, Players } from '../../shared/types'


export const Main = () => {


  const [board, setBoard] = useState<(XorO | undefined)[][]>([
    [undefined, undefined, undefined],
    [undefined, undefined, undefined],
    [undefined, undefined, undefined]
  ])

  const [gameState, setGameState] = useState<GameStateTypes>('COMMENCING')
  const [boardSize, setBoardSize] = useState<number>(3)
  const [gameId, setGameId] = useState<number | null>(null)
  const [players, setPlayers] = useState<Players>([])
  const [moveCount, setMoveCount] = useState<number>(0)
  const [playerStats, setPlayerStats] = useState<Record<number, PlayerStats> | null >(null)
  const [gameStats, setGameStats] = useState<GameStats | null>(null)

  useEffect(() => {
  if (!gameId) return

  const interval = setInterval(() => {
    fetch("http://localhost:4000/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId })
    })
  }, 10000) // every 10 seconds

  return () => clearInterval(interval)
}, [gameId])


  useEffect(() => {
  fetch("http://localhost:4000/players")
    .then(res => res.json())
    .then((data: PlayersResponse) => {
      console.log("Loaded players:", data)
      setPlayers(data.players)
    })
    .catch(err => {
      console.error("Failed to load players", err)
    })
  }, [])


  useEffect(() => {
    if (gameState === 'COMMENCING') {
      console.log("Game commencing, resetting board and move count")
      resetBoard()
      setMoveCount(0)
      fetch("http://localhost:4000/stats")
        .then(res => res.json())
        .then((data: StatsResponse) => {
          setPlayerStats(data.playerStats)
          setGameStats(data.gameStats)

          console.log("Loaded proper stats:", data.gameStats)
        })
        .catch(err => {
          console.error("Failed to load stats", err)
        })

    } else if ((gameState === 'VICTORY' || gameState === 'DRAW') && gameId !== null) {
      concludeGame()
    }
    }
    , [gameState])

  useEffect(() => {
      resetBoard()

  }, [boardSize])

  const currentPlayer: Player | null = players.length > 0 ? players[moveCount % players.length] : null


  const resetBoard = (): void => {setBoard(Array.from({ length: boardSize }, () => Array.from({ length: boardSize }, () => undefined)))}

  const concludeGame = (): void => {
    const outcome = assignOutcome(gameState)
    fetch("http://localhost:4000/endgame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: gameId,
          outcome: outcome
        })
      }).then((res) => res.json())
          .catch((error) => {
            console.error("Error creating game:", error);
          });
    }

  const assignOutcome = (outcome: GameStateTypes): OutcomeMap => {
    const results: OutcomeMap = {}
    for (const player of players) {
      if (outcome === 'DRAW') {
        results[player.id] = 'DRAW'
      } else {
        results[player.id] = (player.icon === currentPlayer?.icon) ? 'WIN' : 'LOSE'
      }

    }
    console.log("returning outcome map:", results)
    return results
  }



  
  const tileSelect = (rowIndex:number, colIndex:number): void => {
    if (!currentPlayer || gameState !== 'IN_PROGRESS' || board[rowIndex][colIndex] !== undefined) return
    recordMove(rowIndex, colIndex)
    const newBoard = board.map(row => [...row])
    newBoard[rowIndex][colIndex] = currentPlayer.icon
    const newGameState = checkWin(newBoard)

    if(newGameState !== 'IN_PROGRESS'){
      setGameState(newGameState)
    } else {
      setMoveCount(prev => prev + 1)
    }

    setBoard(newBoard)
  }

  const recordMove = (rowIndex:number, colIndex:number): void => {
    if (!currentPlayer || gameId === null) return

    fetch("http://localhost:4000/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: gameId,
        playerId: currentPlayer.id,
        row: rowIndex,
        col: colIndex
      })
    }).then((res) => res.json())
        .catch((error) => {
          console.error("Error recording move:", error);
        });
  }

  const checkWin = (boardToCheck: (XorO | undefined)[][]): GameStateTypes => {
    let openLines:number = 0

    for(let i = 0; i < boardToCheck.length; i++) {
      if (checkWinArray(boardToCheck[i]) || checkWinArray(boardToCheck.map(row => row[i]))) {
        const checkedRow:string = checkWinArray(boardToCheck[i])
        const checkedCol:string = checkWinArray(boardToCheck.map(row => row[i]))
        if (checkedRow === 'WON' || checkedCol === 'WON') {
          return 'VICTORY'
        }
        if (checkedRow === 'OPEN' || checkedCol === 'OPEN') {
          openLines++
        }
      }
    }

    const diagonalWinDown = checkWinArray(boardToCheck.map((row, idx) => row[idx]))
    const diagonalWinUp = checkWinArray(boardToCheck.map((row, idx) => row[boardToCheck.length - 1 - idx]))
    if (diagonalWinDown === 'WON' || diagonalWinUp === 'WON') {
      return 'VICTORY'
    }
    if (diagonalWinDown === 'OPEN' || diagonalWinUp === 'OPEN') {
      openLines++
    }

    if (openLines === 0) {
      return 'DRAW'
    }
    return 'IN_PROGRESS'
      
  }

  const checkWinArray = (arrayToCheck: (XorO | undefined)[]): LineState => {
    if(arrayToCheck.includes('X') && arrayToCheck.includes('O')) return 'CLOSED'
    if(arrayToCheck[0] === undefined ) return 'OPEN'
    const unique: (XorO | undefined)[] = Array.from(new Set(arrayToCheck))
    if (unique.length != 1) return "OPEN"
    return 'WON'
  }


  return <div className='min-h-screen bg-gray-100 flex flex-col mt-10 items-center p-6 gap-10'>
    <div className='font-bold text-2xl mb-6'>Tic Tac Toe</div>
    <div className='flex gap-8'>

      {/* Game Board */}
    <div className='bg-white p-4 rounded-xl shadow'>
    <div className='flex flex-col gap-1'>
      {board.map((row, rowIndex) => <div key={rowIndex}className='flex gap-1'>
        {row.map((column, colIndex) => <div key={colIndex} className='border-2 border-gray-900 w-10 h-10 cursor-pointer items-center justify-center text-2xl font-bold flex hover:bg-gray-200'
          onClick={() => {tileSelect(rowIndex, colIndex)}}>
          {column}
        </div>)}
      </div>)}
    </div>
    </div>

    {/* Info Panels */}
    <div className='flex flex-col gap-4 w-64'>
    <div className="bg-white p-4 rounded-xl shadow">
    <IOPanel
      gameState={gameState}
      boardSize={boardSize}
      setGameId={setGameId}
      setGameState={setGameState}
      setBoardSize={setBoardSize}
      currentPlayer={currentPlayer} />
        </div>
    <div className="bg-white p-4 rounded-xl shadow">
    <StatPanel 
      playerStats={playerStats}
      gameStats={gameStats} /></div>
  </div>
  </div>
  </div>
}



const IOPanel = ({ gameState, boardSize, setGameId, setGameState, setBoardSize, currentPlayer }: IOPanelProps) => {
    switch (gameState) {
      case 'COMMENCING':
        return (
        <div className='font-bold text-2x1 flex flex-col items-center gap-3'>
          <button className='border-2 border-gray-900 px-2 py-1' onClick={() => {
            setGameState('IN_PROGRESS')
            console.log("Creating game...")
            fetch("http://localhost:4000/newgame", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                boardSize: boardSize,
              })
            }).then((res) => res.json())
                .then((data) => {
                  console.log("Game created with ID:", data.gameId);
                  setGameId(data.gameId);
                  console.log("Current player:", currentPlayer);
                })
                .catch((error) => {
                  console.error("Error creating game:", error);
                });

            }}>Start Game</button>
            <div><label className='flex items-center gap-2'>
            <span>Board Size:</span>
            <input
              type="number"
              min={3}
              max={15}
              value={boardSize}
              onChange={(e) => {
                const val = Number(e.target.value)
                if (val >= 3 && val <= 15) {
                  setBoardSize(val)
                }
              }}
            />
          </label>
            </div>
          </div>
      )
      case 'IN_PROGRESS':
        if( !currentPlayer ) return (<div className='font-bold text-2x1'>Loading Players</div>)
        return (<div className='font-bold text-2x1'>{currentPlayer.icon}'s Turn</div>)
      case 'VICTORY':
        if( !currentPlayer ) return (<div className='font-bold text-2x1'>Loading Players...</div>)
        return (<div className='font-bold text-2x1'>Complete! {currentPlayer.icon} wins!<RestartButton setGameState={setGameState} /></div>)
      case 'DRAW':
        if( !currentPlayer ) return (<div className='font-bold text-2x1'>Loading Players...</div>)
        return (<div className='font-bold text-2x1'>It's a Draw! <RestartButton setGameState={setGameState} /></div>)
      default:
        return (<div className='font-bold text-2x1'>Unknown State</div>)
    }
  }

  const StatPanel = ( { playerStats, gameStats }: StatPanelProps ) => {
    if (playerStats === null || gameStats === null) return (
      <div>Loading statistics...</div>
    )
    return (
      <div className='font-bold text-2x1'>

        <div className='border-b mb-3 pb-2'>
        <div>Total Games: {gameStats.totalGames}</div>
        <div>Total Draws: {gameStats.totalDraws}</div>
        </div>

        {Object.entries(playerStats).map(([playerKey, stats]) => (
          


          <div key={playerKey} className='mb-3 border-b pb-2'>
            <div>Player {stats.icon}</div>
            <div className='font-semibold'>
            <div> Games won: {stats.gamesWon}</div>
            <div> Wins after an average of {stats.avgMoves} moves!</div>
            </div>
            </div>

        ))}


      </div>
    )
  }

  const RestartButton = ({ setGameState }: RestartButtonProps) => { return <button className='ml-4 border-2 border-gray-900 px-2 py-1' onClick={() => {
            setGameState('COMMENCING')
            }}>Restart?</button>}
          


      
