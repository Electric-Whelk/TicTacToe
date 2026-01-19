export type XorO = 'X' | 'O'

export type OutcomeMap = Record<number, GameResult>
export type GameStats = {totalGames: number; totalDraws: number}
export type GameResult = "WIN" | "LOSE" | "DRAW"
export type PlayerStats = {
  icon: string
  gamesWon: number
  avgMoves: number
}

export type Player = { id: number, icon : XorO }
export type Players = Player[]


