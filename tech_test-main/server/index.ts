import express, { Request, Response } from "express"
import cors from "cors"

import db = require("./db") 

import { OutcomeMap, GameStats, PlayerStats, Players, XorO } from "../shared/types"
import { PlayerRow } from "./types"

const app = express.application = express();

app.use(cors())
app.use(express.json())


app.get("/", (req: Request, res: Response) => {
  res.json({ status: "ok" })
})

app.get("/players", (req: Request, res: Response) => {
  const rows = db.prepare(`SELECT * FROM players`).all() as { id: number; icon: string }[]

  const players: Players = rows.map(row => {
    const icon: XorO = row.icon === 'X' ? 'X' : 'O'
    return { id: row.id, icon }
  })

  res.json({ players })
})

app.get("/stats", (req: Request, res: Response) => {
  const players = db.prepare(`SELECT * FROM players`).all() as PlayerRow[]

  const totalGamesRow = db
    .prepare(`SELECT COUNT(*) as count FROM games WHERE status = 'COMPLETE'`)
    .get() as { count: number }

  const totalDrawsRow = db
    .prepare(
      `SELECT COUNT(DISTINCT games.id) as count
       FROM games
       JOIN gameoutcomes ON games.id = gameoutcomes.game_id
       WHERE gameoutcomes.result = 'DRAW'`
    )
    .get() as { count: number }

  const gameStats: GameStats = {
    totalGames: totalGamesRow.count,
    totalDraws: totalDrawsRow.count,
  }

  const playerStats: Record<number, PlayerStats> = {}

  players.forEach((player) => {
    const icon: 'X' | 'O' = player.icon === 'X' ? 'X' : 'O'

    const gamesWonRow = db
      .prepare(
        `SELECT COUNT(*) as count 
         FROM gameoutcomes 
         WHERE player_id = ?
         AND result = 'WIN'`
      )
      .get(player.id) as { count: number }

    const avgMovesRow = db
      .prepare(
        `SELECT AVG(move_count) as avg_moves FROM (
           SELECT COUNT(moves.id) as move_count
           FROM games
           JOIN moves ON games.id = moves.game_id
           JOIN gameoutcomes ON games.id = gameoutcomes.game_id
           WHERE gameoutcomes.player_id = ?
           AND gameoutcomes.result = 'WIN'
           GROUP BY games.id
         )`
      )
      .get(player.id) as { avg_moves: number | null }

    playerStats[player.id] = {
      icon,
      gamesWon: gamesWonRow.count,
      avgMoves: avgMovesRow.avg_moves ?? 0,
    }
  })

  res.json({ gameStats, playerStats })
})

app.post("/move", (req: Request, res: Response) => {
  const { gameId, playerId, row, col } = req.body as {
    gameId: number
    playerId: number
    row: number
    col: number
  }

  db.prepare(
    `INSERT INTO moves (game_id, player_id, row, col) VALUES (?, ?, ?, ?)`
  ).run(gameId, playerId, row, col)

  res.json({ success: true })
})

app.post("/heartbeat", (req: Request, res: Response) => {
  const { gameId } = req.body as { gameId: number }

  db.prepare(
    `UPDATE games SET last_seen = datetime('now') WHERE id = ?`
  ).run(gameId)

  res.json({ ok: true })
})

app.post("/newgame", (req: Request, res: Response) => {
  const { boardSize } = req.body as { boardSize: number }

  const result = db
    .prepare(
      `INSERT INTO games (board_size, status, created_at)
       VALUES (?, 'IN_PROGRESS', datetime('now'))`
    )
    .run(boardSize)

  res.json({ gameId: result.lastInsertRowid })
})

app.post("/endgame", (req: Request, res: Response) => {
  const { gameId, outcome } = req.body as {
    gameId: number
    outcome: OutcomeMap
  }

  db.prepare(
    `UPDATE games SET status = 'COMPLETE', finished_at = datetime('now') WHERE id = ?`
  ).run(gameId)

  const stmtOutcome = db.prepare(
    `INSERT INTO gameoutcomes (game_id, player_id, result) VALUES (?, ?, ?)`
  )

  for (const playerId in outcome) {
    stmtOutcome.run(gameId, Number(playerId), outcome[playerId])
  }

  res.json({ success: true })
})

const PORT = 4000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
