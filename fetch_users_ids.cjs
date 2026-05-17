const https = require('https');
https.get('https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/actualcmnl.json', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const users = JSON.parse(data).users;
    console.log(users.map(u => ({username: u.username, name: u.name})).slice(0, 10));
  });
});
