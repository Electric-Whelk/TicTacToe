import { Player, Players, PlayerStats, GameStats, XorO } from "../../shared/types"


export type GameStateTypes = 'COMMENCING' | 'IN_PROGRESS' | 'VICTORY' | 'DRAW'
export type LineState = 'CLOSED' | 'OPEN' | 'WON'

export type IOPanelProps = {
  gameState: GameStateTypes
  boardSize: number
  setGameId: React.Dispatch<React.SetStateAction<number | null>>
  setGameState: React.Dispatch<React.SetStateAction<GameStateTypes>>
  setBoardSize: React.Dispatch<React.SetStateAction<number>>
  currentPlayer: Player | null

}

export type StatPanelProps = {
  playerStats: Record<number, PlayerStats> | null
  gameStats: GameStats | null
}


export type RestartButtonProps = {
  setGameState: React.Dispatch<React.SetStateAction<GameStateTypes>>
}

export type TileSelectProps = {
  rowIndex: number
  colIndex: number
  moveCount: number
  currentPlayer?: Player | null
  setMoveCount: React.Dispatch<React.SetStateAction<number>>
  setBoard: React.Dispatch<React.SetStateAction<(XorO | undefined)[][]>>
}

export type PlayersResponse = {
  players: Players
}

export type StatsResponse = {
  playerStats: Record<number, PlayerStats>
  gameStats: GameStats
}