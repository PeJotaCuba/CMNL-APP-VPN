const fs = require('fs');
fetch('https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/actualcmnl.json')
  .then(r => r.json())
  .then(d => {
    console.log("Keys:", Object.keys(d));
    if (d.agendaEfemerides) {
      console.log("agendaEfemerides keys:", Object.keys(d.agendaEfemerides).slice(0, 5));
    }
    if (d.users) {
      console.log("users count:", d.users.length);
    }
  })
  .catch(e => console.error(e));
