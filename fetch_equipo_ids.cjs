const https = require('https');
https.get('https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/equipocmnl.json', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const users = JSON.parse(data);
    console.log(users.map(u => ({id: u.id, name: u.name})).slice(0, 10));
  });
});
