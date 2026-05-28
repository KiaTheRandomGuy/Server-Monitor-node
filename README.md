# ServerMonitor Node Agent

Lightweight agent that reports CPU, RAM, disk, and network stats to the ServerMonitor dashboard.

## One-line install

```bash
curl -fsSL https://smon.realkia.com/install.sh | bash -s -- --server https://smon.realkia.com --token smon-agent-token --name myserver
```

## Manual

```bash
npm install
SMON_SERVER=https://smon.realkia.com SMON_TOKEN=smon-agent-token SMON_NAME=myserver node agent.js
```

Reports every 10 seconds. Uses ~5MB RAM.
