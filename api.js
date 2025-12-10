const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.json());

// -----------------------------------------------
// Conectar DB
// -----------------------------------------------
const db = new sqlite3.Database("./db/data.db");


// ============================================================
//  CITAS 
// ============================================================
app.get("/citas", (req, res) => {
  db.all("SELECT * FROM citas", [], (err, rows) => {
    if (err) return res.status(500).send("Error en DB");

    if (req.query.json === "1") return res.json(rows);

    let html = `
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Citas</title>
        <style>
          body{font-family:Arial;background:#f0f3f9;padding:20px;}
          h1{color:#2563eb}
          table{width:100%;border-collapse:collapse;background:white;}
          th{background:#2563eb;color:white;padding:10px;}
          td{padding:10px;border-bottom:1px solid #ddd;}
          tr:nth-child(even){background:#eef4ff;}
        </style>
      </head>
      <body>
        <h1>Listado de Citas</h1>
        <table>
          <tr>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Teléfono</th>
            <th>Nota</th>
            <th>Estado</th>
          </tr>`;

    rows.forEach(c => {
      html += `
        <tr>
          <td>${c.cliente}</td>
          <td>${c.fecha}</td>
          <td>${c.hora}</td>
          <td>${c.telefono || ""}</td>
          <td>${c.nota || ""}</td>
          <td>${c.estado || "pendiente"}</td>
        </tr>`;
    });

    html += `</table></body></html>`;
    res.send(html);
  });
});


// ============================================================
//  USUARIOS 
// ============================================================
app.get("/usuarios", (req, res) => {
  db.all("SELECT username, email, role FROM users", [], (err, rows) => {
    if (err) return res.status(500).send("Error en DB");

    if (req.query.json === "1") return res.json(rows);

    let html = `
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Usuarios</title>
        <style>
          body{font-family:Arial;background:#f0f3f9;padding:20px;}
          h1{color:#2563eb}
          table{width:100%;border-collapse:collapse;background:white;}
          th{background:#2563eb;color:white;padding:10px;}
          td{padding:10px;border-bottom:1px solid #ddd;}
          tr:nth-child(even){background:#eef4ff;}
        </style>
      </head>
      <body>
        <h1>Usuarios Registrados</h1>
        <table>
          <tr>
            <th>Usuario</th>
            <th>Email</th>
            <th>Rol</th>
          </tr>`;

    rows.forEach(u => {
      html += `
        <tr>
          <td>${u.username}</td>
          <td>${u.email}</td>
          <td>${u.role}</td>
        </tr>`;
    });

    html += `</table></body></html>`;
    res.send(html);
  });
});


// ============================================================
//  EMPRESAS
// ============================================================
app.get("/empresas", (req, res) => {
  db.all("SELECT nombre, direccion, telefono, imagen FROM empresas", [], (err, rows) => {
    if (err) return res.status(500).send("Error en DB");

    if (req.query.json === "1") return res.json(rows);

    let html = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Empresas</title>
      <style>
        body{font-family:Arial;background:#f0f3f9;padding:20px;}
        h1{color:#2563eb}
        table{width:100%;border-collapse:collapse;background:white;}
        th{background:#2563eb;color:white;padding:10px;}
        td{padding:10px;border-bottom:1px solid #ddd;}
        tr:nth-child(even){background:#eef4ff;}
        img{width:90px;border-radius:12px;}
      </style>
    </head>
    <body>
      <h1>Empresas</h1>
      <table>
        <tr>
          <th>Nombre</th>
          <th>Dirección</th>
          <th>Teléfono</th>
          <th>Imagen</th>
        </tr>`;

    rows.forEach(e => {
      html += `
        <tr>
          <td>${e.nombre}</td>
          <td>${e.direccion || ""}</td>
          <td>${e.telefono || ""}</td>
          <td>${e.imagen ? `<img src="${e.imagen}">` : ""}</td>
        </tr>`;
    });

    html += `</table></body></html>`;
    res.send(html);
  });
});

// ============================================================
//  TRABAJADORES (FOTO + EMPRESA)
// ============================================================
app.get("/trabajadores", (req, res) => {
  const sql = `
    SELECT 
      users.username,
      users.email,
      users.imagen,
      empresas.nombre AS empresa
    FROM users
    LEFT JOIN empresas ON empresas.id = users.empresa_id
    WHERE users.role = 'trabajador'
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("ERROR SQL:", err.message);
      return res.status(500).send("Error en DB: " + err.message);
    }

    if (req.query.json === "1") return res.json(rows);

    let html = `
    <html><head><meta charset="UTF-8"><title>Trabajadores</title>
    <style>
      body{font-family:Arial;background:#f0f3f9;padding:20px;}
      h1{color:#2563eb}
      table{width:100%;border-collapse:collapse;background:white;}
      th{background:#2563eb;color:white;padding:10px;}
      td{padding:10px;border-bottom:1px solid #ddd;}
      tr:nth-child(even){background:#eef4ff;}
      img{width:90px;border-radius:50%}
    </style>
    </head>
    <body>
      <h1>Trabajadores</h1>
      <table>
        <tr><th>Nombre</th><th>Email</th><th>Empresa</th><th>Foto</th></tr>
    `;

    rows.forEach(t => {
      html += `
        <tr>
          <td>${t.username}</td>
          <td>${t.email}</td>
          <td>${t.empresa || "Sin asignar"}</td>
          <td>${t.imagen ? `<img src="${t.imagen}">` : ""}</td>
        </tr>`;
    });

    html += `</table></body></html>`;
    res.send(html);
  });
});



// ============================================================
//  🚀 INICIAR SERVIDOR
// ============================================================
app.listen(3000, () => {
  console.log("API disponible en http://localhost:3000");
});
