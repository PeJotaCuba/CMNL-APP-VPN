const https = require('https');
https.get('https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/equipocmnl.json', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const arr = JSON.parse(data);
    const levels = new Set(arr.map(a => a.level));
    console.log(Array.from(levels));
  });
});
