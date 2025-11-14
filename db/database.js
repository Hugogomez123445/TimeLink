const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Ruta a la base de datos
const dbPath = path.join(__dirname, "data.db");
const db = new sqlite3.Database(dbPath);

// Crear tabla de usuarios 
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT,
    password TEXT
  )
`);

// Crear tabla de citas 
db.run(`
  CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    cliente TEXT NOT NULL
  )
`);

module.exports = db;
