// server/db.ts
import Database = require("better-sqlite3")
import path = require("path")

const dbPath = path.join(__dirname, "tic_tac_toe.db")
const db = new Database(dbPath)

// --- your table creation & seeding
db.exec(`
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_size INTEGER,
  status TEXT CHECK(status IN ('IN_PROGRESS','COMPLETE','ABANDONED')),
  created_at TEXT,
  finished_at TEXT,
  last_seen TEXT
)
`)

db.exec(`
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icon TEXT
)
`)

db.exec(`
CREATE TABLE IF NOT EXISTS gameoutcomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER,
  player_id INTEGER,
  result TEXT CHECK(result IN ('WIN','LOSE','DRAW')),
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
)
`)

db.exec(`
CREATE TABLE IF NOT EXISTS moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER,
  player_id INTEGER,
  row INTEGER,
  col INTEGER,
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
)
`)

// set abandoned games
db.exec(`
UPDATE games
SET status = 'ABANDONED'
WHERE status = 'IN_PROGRESS'
AND last_seen < datetime('now', '-30 seconds')
`)

// seed players
const seedPlayers = () => {
  const row = db.prepare(`SELECT COUNT(*) as count FROM players`).get() as { count: number }
  const count = row.count
  if (count === 0) {
    db.prepare(`INSERT INTO players (icon) VALUES (?)`).run("X")
    db.prepare(`INSERT INTO players (icon) VALUES (?)`).run("O")
    console.log("Players seeded: X and O")
  }
}
seedPlayers()

// THIS is key: explicitly type as Database.Database
export = db
