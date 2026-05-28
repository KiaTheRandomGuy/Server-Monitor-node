const si = require('systeminformation');
const https = require('https');
const http = require('http');

const SERVER = process.env.SMON_SERVER || '';
const TOKEN = process.env.SMON_TOKEN || 'smon-agent-token';
const NAME = process.env.SMON_NAME || require('os').hostname();

if (!SERVER) {
  console.error('SMON_SERVER env var required. Example: SMON_SERVER=https://smon.realkia.com node agent.js');
  process.exit(1);
}

async function report() {
  try {
    const [cpuLoad, mem, disk, net] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats()
    ]);
    const cpu = parseFloat(cpuLoad.currentLoad.toFixed(1));
    const ram = parseFloat(((mem.used / mem.total) * 100).toFixed(1));
    const mainDisk = disk.find(d => d.mount === '/') || disk[0];
    const diskPct = mainDisk ? parseFloat(((mainDisk.used / mainDisk.size) * 100).toFixed(1)) : 0;
    const mainNet = net[0] || {};
    const net_in = Math.round((mainNet.rx_sec || 0) / 1024);
    const net_out = Math.round((mainNet.tx_sec || 0) / 1024);

    const payload = JSON.stringify({ token: TOKEN, name: NAME, cpu, ram, disk: diskPct, net_in, net_out });
    const url = new URL(SERVER + '/api/report');
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/api/report',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      rejectUnauthorized: false
    }, res => { res.resume(); });
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (e) { /* silent */ }
}

report();
setInterval(report, 10000);
console.log(`Agent started: reporting to ${SERVER} as "${NAME}"`);
