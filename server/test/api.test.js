const assert = require('assert');
const http = require('http');
const { app } = require('../src/index');

const PORT = 5098;
let serverInstance;

function makeRequest(method, path, body = null, deviceId = null, clientIp = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (dataString) {
      headers['Content-Length'] = Buffer.byteLength(dataString);
    }
    if (deviceId) {
      headers['x-device-id'] = deviceId;
    }
    if (clientIp) {
      headers['x-forwarded-for'] = clientIp;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers
      },
      (res) => {
        let bodyChunks = [];
        res.on('data', chunk => bodyChunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(bodyChunks).toString();
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch (e) {
            json = raw;
          }
          resolve({ status: res.statusCode, data: json });
        });
      }
    );

    req.on('error', reject);
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Refactored Khitmah API Tests (No Auth, Cooldown & Read button)...\n');

  serverInstance = app.listen(PORT);
  await new Promise(r => setTimeout(r, 500));

  try {
    // 1. Health check
    const health = await makeRequest('GET', '/api/health');
    assert.strictEqual(health.status, 200);
    console.log('✅ 1. Health check passed');

    // 2. Fetch initial Juz list (no auth needed)
    const device1 = 'test-device-uuid-1';
    const ip1 = '192.168.1.101';
    const initialList = await makeRequest('GET', '/api/juz', null, device1, ip1);
    assert.strictEqual(initialList.status, 200);
    assert.strictEqual(initialList.data.juzList.length, 30);
    assert.strictEqual(initialList.data.cooldown.active, false);
    console.log('✅ 2. Loaded 30 Juz cards, cooldown inactive for device 1');

    // 3. Mark Juz 1 as Read by device 1
    const read1 = await makeRequest('POST', '/api/juz/1/read', {}, device1, ip1);
    assert.strictEqual(read1.status, 200);
    assert.ok(read1.data.remainingSeconds > 0);
    console.log('✅ 3. Device 1 successfully read Juz 1, entered 45-minute cooldown');

    // 4. Device 1 attempts to read Juz 2 immediately -> should be blocked by cooldown (429)
    const read2Blocked = await makeRequest('POST', '/api/juz/2/read', {}, device1, ip1);
    assert.strictEqual(read2Blocked.status, 429);
    assert.strictEqual(read2Blocked.data.error, 'cooldown_active');
    console.log('✅ 4. Cooldown enforced: Device 1 blocked with 429 from reading before 45 minutes');

    // 5. Another device with DIFFERENT IP attempts to read Juz 1 (already completed) -> should be rejected with 409
    const device2 = 'test-device-uuid-2';
    const ip2 = '192.168.1.102';
    const conflictRead = await makeRequest('POST', '/api/juz/1/read', {}, device2, ip2);
    assert.strictEqual(conflictRead.status, 409);
    console.log('✅ 5. Conditional update enforced: Device 2 blocked with 409 (already completed)');

    // 6. Test Quran pages strictly for Juz 1
    const pages1 = await makeRequest('GET', '/api/juz/1/pages');
    assert.strictEqual(pages1.status, 200);
    assert.strictEqual(pages1.data.juzNumber, 1);
    assert.strictEqual(pages1.data.pages.length, 21);
    console.log('✅ 6. Scoped Quran pages verified: Juz 1 has 21 pages (1-21)');

    // 7. Verify atomic Khitmah reset when all 30 completed
    console.log('⏳ Simulating completion of remaining 29 juz with unique devices and IPs...');
    for (let j = 2; j <= 30; j++) {
      const dev = `device-sim-${j}-${Date.now()}`;
      const simIp = `10.0.0.${j}`;
      const res = await makeRequest('POST', `/api/juz/${j}/read`, {}, dev, simIp);
      assert.strictEqual(res.status, 200);
      if (j === 30) {
        assert.strictEqual(res.data.khitmahFinished, true);
        console.log('🎉 7. Juz 30 completion triggered atomic Khitmah reset! Total:', res.data.totalCompletedKhitmahs);
      }
    }

    // Verify board reset
    const afterReset = await makeRequest('GET', '/api/juz');
    assert.strictEqual(afterReset.data.counter.currentProgress, 0);
    assert.strictEqual(afterReset.data.counter.availableCount, 30);
    console.log('✅ 8. Post-reset verified: all 30 Juz back to Available, progress 0/30');

    console.log('\n🌟 ALL TESTS PASSED SUCCESSFULLY! 🌟\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    if (serverInstance) serverInstance.close();
  }
}

runTests();
