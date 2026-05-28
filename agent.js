const si = require('systeminformation');
const https = require('https');
const http = require('http');

const SERVER = process.env.SMON_SERVER || '';
const TOKEN = process.env.SMON_TOKEN || 'smon-agent-token';
const NAME = process.env.SMON_NAME || require('os').hostname();
const INTERVAL = 10000;

if (!SERVER) {
  console.error('SMON_SERVER env var required.');
  process.exit(1);
}

// Cache network baseline for delta calculation
let lastNet = null;

async function collect() {
  const cpu = await si.currentLoad();
  const mem = await si.mem();
  const disks = await si.fsSize();
  const net = await si.networkStats();

  const cpuPct = parseFloat(cpu.currentLoad.toFixed(1));
  const ramPct = parseFloat((((mem.total - mem.available) / mem.total) * 100).toFixed(1));
  const swap = mem.swaptotal > 0 ? parseFloat(((mem.swapused / mem.swaptotal) * 100).toFixed(1)) : 0;
  const mainDisk = disks.find(d => d.mount === '/') || disks[0];
  const diskPct = mainDisk ? parseFloat(((mainDisk.used / mainDisk.size) * 100).toFixed(1)) : 0;
  const mainNet = net[0] || {};
  const net_in = Math.round((mainNet.rx_sec || 0) / 1024);
  const net_out = Math.round((mainNet.tx_sec || 0) / 1024);

  return { cpu: cpuPct, ram: ramPct, disk: diskPct, net_in, net_out, swap };
}

function send(data) {
  const payload = JSON.stringify({ token: TOKEN, name: NAME, ...data });
  const url = new URL(SERVER + '/api/report');
  const mod = url.protocol === 'https:' ? https : http;
  const req = mod.request({
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: '/api/report', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    rejectUnauthorized: false
  }, res => { res.resume(); });
  req.on('error', () => {});
  req.write(payload);
  req.end();
}

async function run() {
  try {
    const data = await collect();
    send(data);
  } catch (e) { /* silent */ }
}

run();
setInterval(run, INTERVAL);
console.log(`Agent started: ${NAME} -> ${SERVER}`);
