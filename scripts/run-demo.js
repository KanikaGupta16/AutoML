#!/usr/bin/env node
/**
 * Demo test: starts in-memory MongoDB, runs the server, triggers a discovery, polls status, prints results.
 * Usage: npm run demo
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const HEALTH_PATH = '/health';
const START_PATH = '/discovery/start';
const POLL_INTERVAL_MS = 15000;
const MAX_POLL_TIME_MS = 120000; // 2 min
const DEMO_PROMPT = 'Find datasets for housing price prediction';

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method: 'GET',
      },
      (res) => {
        let body = '';
        res.on('data', (ch) => (body += ch));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let b = '';
        res.on('data', (ch) => (b += ch));
        res.on('end', () => {
          try {
            resolve(JSON.parse(b));
          } catch {
            resolve(b);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await get(BASE_URL + HEALTH_PATH);
      if (res && res.status === 'ok') return true;
    } catch (_) {}
    await wait(1000);
  }
  return false;
}

async function main() {
  let memoryServer = null;
  let serverProcess = null;

  console.log('🧪 Demo test: Discovery Pipeline\n');

  try {
    console.log('1️⃣  Starting in-memory MongoDB...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    console.log('   ✅ In-memory MongoDB ready\n');

    console.log('2️⃣  Starting server (database: automl_discovery)...');
    const serverPath = path.join(__dirname, '..', 'dist', 'index.js');
    serverProcess = spawn('node', [serverPath], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        MONGODB_URI: uri,
        MONGODB_DATABASE: 'automl_discovery',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProcess.stdout.on('data', (d) => process.stdout.write(d));
    serverProcess.stderr.on('data', (d) => process.stderr.write(d));

    const ready = await waitForHealth();
    if (!ready) {
      throw new Error('Server did not become ready in time');
    }
    console.log('   ✅ Server ready\n');

    console.log('3️⃣  Starting discovery...');
    const startRes = await post(BASE_URL + START_PATH, { prompt: DEMO_PROMPT });
    if (startRes.error) {
      throw new Error(startRes.error);
    }
    const projectId = startRes.project_id;
    console.log('   Project ID:', projectId);
    console.log('   Prompt:', DEMO_PROMPT);
    console.log('   ✅ Discovery started\n');

    console.log('4️⃣  Polling status (every 15s, max 2 min)...');
    const startTime = Date.now();
    let lastStats = null;
    while (Date.now() - startTime < MAX_POLL_TIME_MS) {
      await wait(POLL_INTERVAL_MS);
      try {
        const status = await get(`${BASE_URL}/discovery/${projectId}/status`);
        lastStats = status.stats || {};
        const total = lastStats.total_sources ?? 0;
        const validated = lastStats.validated ?? 0;
        const rejected = lastStats.rejected ?? 0;
        console.log(`   [${Math.round((Date.now() - startTime) / 1000)}s] total: ${total}, validated: ${validated}, rejected: ${rejected}`);
        if (total > 0 && (validated + rejected) >= total) {
          console.log('   ✅ Pipeline completed\n');
          break;
        }
      } catch (e) {
        console.log('   Poll error:', e.message);
      }
    }

    console.log('5️⃣  Final status:');
    try {
      const status = await get(`${BASE_URL}/discovery/${projectId}/status`);
      console.log('   Discovery chain:', JSON.stringify(status.discovery_chain, null, 2));
      console.log('   Stats:', JSON.stringify(status.stats, null, 2));
      if (status.high_quality_sources && status.high_quality_sources.length > 0) {
        console.log('   High-quality sources (sample):');
        status.high_quality_sources.slice(0, 3).forEach((s, i) => {
          console.log(`     ${i + 1}. ${s.url} (score: ${s.relevance_score})`);
        });
      }
    } catch (e) {
      console.log('   Could not fetch final status:', e.message);
    }

    console.log('\n✅ Demo test finished.');
  } catch (err) {
    console.error('\n❌ Demo failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await wait(1500);
      if (serverProcess.exitCode === null) serverProcess.kill('SIGKILL');
    }
    if (memoryServer) {
      await memoryServer.stop();
    }
  }
}

main();
