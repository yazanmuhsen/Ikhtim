'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const http = require('http');
const assert = require('assert');
const WebSocket = require('ws');

if (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim() !== '') {
  console.error('ABORT: Tests refuse to run when DATABASE_URL is set. Use embedded PGlite only.');
  process.exit(1);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'khitmah-test-'));
process.env.DATABASE_URL = '';
process.env.PGLITE_DATA_DIR = tmpDir;
process.env.ADMIN_TOKEN = '';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

let PORT;
let startServer;
let stopServer;

function makeRequest(method, reqPath, body = null, deviceId = null, clientIp = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders
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
        hostname: '127.0.0.1',
        port: PORT,
        path: reqPath,
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
          resolve({ status: res.statusCode, data: json, raw, headers: res.headers });
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

function assertNoLeakedFields(payload) {
  const encoded = JSON.stringify(payload);
  assert.ok(!encoded.includes('creator_device_id'));
  assert.ok(!encoded.includes('creator_ip'));
  assert.ok(!encoded.includes('manage_token_hash'));
  assert.ok(!/token_hash/i.test(encoded));
}

async function createKhitmah(personName, dedication, deviceId, ip) {
  return makeRequest('POST', '/api/k', { personName, dedication }, deviceId, ip);
}

async function completeAllCustomJuz(slug, ipBase) {
  let last = null;
  for (let j = 1; j <= 30; j++) {
    const dev = `custom-finisher-${slug}-${j}-${Date.now()}-${Math.random()}`;
    const ip = `${ipBase}.${j}`;
    last = await makeRequest('POST', `/api/k/${slug}/juz/${j}/read`, {}, dev, ip);
    assert.strictEqual(last.status, 200, `expected 200 completing juz ${j} of ${slug}, got ${last.status} ${JSON.stringify(last.data)}`);
  }
  return last;
}

function connectBoardListener(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    const message = new Promise((res, rej) => {
      const timer = setTimeout(() => {
        ws.terminate();
        rej(new Error('Timed out waiting for BOARD_UPDATE'));
      }, timeoutMs);
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'BOARD_UPDATE') {
            clearTimeout(timer);
            ws.close();
            res(msg);
          }
        } catch (e) {
          // ignore
        }
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        rej(err);
      });
    });
    ws.on('open', () => resolve({ message }));
    ws.on('error', reject);
  });
}

async function cleanup() {
  try {
    if (stopServer) await stopServer();
  } catch (e) {
    // ignore
  }
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
  } catch (e) {
    console.warn('Could not delete temp test database folder:', e.message);
  }
}

async function runTests() {
  PORT = await getFreePort();
  process.env.PORT = String(PORT);

  ({ startServer, stopServer } = require('../src/index'));
  await startServer();

  console.log(`[START] Starting Khitmah API tests on port ${PORT} (throwaway PGlite)...\n`);

  try {
    const health = await makeRequest('GET', '/api/health');
    assert.strictEqual(health.status, 200);
    console.log('[PASS] 1. Health check passed');

    const device1 = 'test-device-uuid-1';
    const ip1 = '192.168.1.101';
    const initialList = await makeRequest('GET', '/api/juz', null, device1, ip1);
    assert.strictEqual(initialList.status, 200);
    assert.strictEqual(initialList.data.juzList.length, 30);
    assert.strictEqual(initialList.data.cooldown.active, false);
    console.log('[PASS] 2. Loaded 30 Juz cards, cooldown inactive for device 1');

    const read1 = await makeRequest('POST', '/api/juz/1/read', {}, device1, ip1);
    assert.strictEqual(read1.status, 200);
    assert.ok(read1.data.remainingSeconds > 0);
    console.log('[PASS] 3. Device 1 successfully read Juz 1, entered 45-minute cooldown');

    const read2Blocked = await makeRequest('POST', '/api/juz/2/read', {}, device1, ip1);
    assert.strictEqual(read2Blocked.status, 429);
    assert.strictEqual(read2Blocked.data.error, 'cooldown_active');
    console.log('[PASS] 4. Cooldown enforced: Device 1 blocked with 429 from reading before 45 minutes');

    const device2 = 'test-device-uuid-2';
    const ip2 = '192.168.1.102';
    const conflictRead = await makeRequest('POST', '/api/juz/1/read', {}, device2, ip2);
    assert.strictEqual(conflictRead.status, 409);
    console.log('[PASS] 5. Conditional update enforced: Device 2 blocked with 409 (already completed)');

    const pages1 = await makeRequest('GET', '/api/juz/1/pages');
    assert.strictEqual(pages1.status, 200);
    assert.strictEqual(pages1.data.juzNumber, 1);
    assert.ok(Array.isArray(pages1.data.pages));
    assert.strictEqual(pages1.data.pages.length, 21);
    console.log('[PASS] 6. Scoped Quran pages verified: Juz 1 has 21 pages (1-21)');

    console.log('[INFO] Simulating completion of remaining 29 juz with unique devices and IPs...');
    for (let j = 2; j <= 30; j++) {
      const dev = `device-sim-${j}-${Date.now()}`;
      const simIp = `10.0.0.${j}`;
      const res = await makeRequest('POST', `/api/juz/${j}/read`, {}, dev, simIp);
      assert.strictEqual(res.status, 200);
      if (j === 30) {
        assert.strictEqual(res.data.khitmahFinished, true);
        console.log('[DONE] 7. Juz 30 completion triggered atomic Khitmah reset! Total:', res.data.totalCompletedKhitmahs);
      }
    }

    const afterReset = await makeRequest('GET', '/api/juz');
    assert.strictEqual(afterReset.data.counter.currentProgress, 0);
    assert.strictEqual(afterReset.data.counter.availableCount, 30);
    console.log('[PASS] 8. Post-reset verified: all 30 Juz back to Available, progress 0/30');

    const mainSnapshot = await makeRequest('GET', '/api/juz');
    const mainTotal = mainSnapshot.data.counter.totalCompleted;
    const mainProgress = mainSnapshot.data.counter.currentProgress;

    const missingDevice = await makeRequest('POST', '/api/k', { personName: 'Test Person' }, null, '203.0.113.10');
    assert.strictEqual(missingDevice.status, 400);
    console.log('[PASS] 9. POST /api/k without x-device-id returns 400');

    const emptyName = await createKhitmah('   ', '', 'dev-create-1', '198.51.100.1');
    assert.strictEqual(emptyName.status, 400);

    const longName = await createKhitmah('x'.repeat(81), '', 'dev-create-1', '198.51.100.1');
    assert.strictEqual(longName.status, 400);

    const longDed = await createKhitmah('Valid Name', 'd'.repeat(301), 'dev-create-1', '198.51.100.1');
    assert.strictEqual(longDed.status, 400);
    console.log('[PASS] 10. Create validation rejects empty name and over-length fields');

    const tagged = await createKhitmah('<b>Ali</b>', '<script>x</script>dua', 'dev-create-1', '198.51.100.1');
    assert.strictEqual(tagged.status, 201);
    assert.ok(tagged.data.slug);
    assert.ok(tagged.data.manageToken);
    assert.ok(tagged.data.manageToken.length >= 24);
    assert.strictEqual(tagged.data.slug.length, 8);
    assert.match(tagged.data.slug, /^[a-z0-9]{8}$/);

    const taggedBoard = await makeRequest('GET', `/api/k/${tagged.data.slug}`, null, 'dev-create-1', '198.51.100.1');
    assert.strictEqual(taggedBoard.status, 200);
    assert.strictEqual(taggedBoard.data.personName, 'Ali');
    assert.strictEqual(taggedBoard.data.dedication, 'xdua');
    assert.strictEqual(taggedBoard.data.juzList.length, 30);
    assert.strictEqual(taggedBoard.data.counter.totalCompleted, 0);
    assert.strictEqual(taggedBoard.data.counter.currentProgress, 0);
    assert.strictEqual(taggedBoard.data.counter.availableCount, 30);
    assert.strictEqual(taggedBoard.data.counter.totalJuz, 30);
    assert.ok(taggedBoard.data.cooldown);
    assert.ok(taggedBoard.data.serverTime);
    assertNoLeakedFields(taggedBoard.data);
    console.log('[PASS] 11. Create strips tags, returns token once, GET board shape matches /api/juz plus person fields');

    const unknown = await makeRequest('GET', '/api/k/zzzzzzzz');
    assert.strictEqual(unknown.status, 404);
    const unknownRead = await makeRequest('POST', '/api/k/zzzzzzzz/juz/1/read', {}, 'dev-404', '198.51.100.9');
    assert.strictEqual(unknownRead.status, 404);
    console.log('[PASS] 12. Unknown slug returns 404');

    const rateDevice = `rate-device-${Date.now()}`;
    const rateIp = '203.0.113.50';
    for (let i = 0; i < 5; i++) {
      const res = await createKhitmah(`Person ${i}`, '', rateDevice, rateIp);
      assert.strictEqual(res.status, 201, `create ${i} should succeed`);
    }
    const sixth = await createKhitmah('Person six', '', rateDevice, rateIp);
    assert.strictEqual(sixth.status, 429);
    console.log('[PASS] 13. Device rate limit: 6th create in 24h returns 429');

    const ipLimit = '203.0.113.77';
    for (let i = 0; i < 20; i++) {
      const res = await createKhitmah(`Ip Person ${i}`, '', `ip-limit-dev-${i}-${Date.now()}`, ipLimit);
      assert.strictEqual(res.status, 201, `IP create ${i} should succeed, got ${res.status}`);
    }
    const ip21 = await createKhitmah('Ip Person 21', '', `ip-limit-dev-21-${Date.now()}`, ipLimit);
    assert.strictEqual(ip21.status, 429);
    console.log('[PASS] 14. IP rate limit: 21st create from same IP returns 429');

    const readCustom = await createKhitmah('Reader One', 'dedication here', 'dev-reader-owner', '198.51.100.20');
    assert.strictEqual(readCustom.status, 201);
    const slugR = readCustom.data.slug;
    const readerDev = `custom-reader-${Date.now()}`;
    const readerIp = '198.51.100.21';

    const customRead = await makeRequest('POST', `/api/k/${slugR}/juz/3/read`, {}, readerDev, readerIp);
    assert.strictEqual(customRead.status, 200);
    assert.ok(customRead.data.remainingSeconds > 0);

    const customCooldown = await makeRequest('POST', `/api/k/${slugR}/juz/4/read`, {}, readerDev, readerIp);
    assert.strictEqual(customCooldown.status, 429);
    assert.strictEqual(customCooldown.data.error, 'cooldown_active');

    const otherDev = `custom-other-${Date.now()}`;
    const duplicate = await makeRequest('POST', `/api/k/${slugR}/juz/3/read`, {}, otherDev, '198.51.100.22');
    assert.strictEqual(duplicate.status, 409);
    console.log('[PASS] 15. Custom read, 45-minute cooldown, and 409 on double-complete');

    const isoA = await createKhitmah('Khitmah A', '', `iso-owner-a-${Date.now()}`, '198.51.100.30');
    const isoB = await createKhitmah('Khitmah B', '', `iso-owner-b-${Date.now()}`, '198.51.100.31');
    assert.strictEqual(isoA.status, 201);
    assert.strictEqual(isoB.status, 201);

    const finishA = await completeAllCustomJuz(isoA.data.slug, '10.10.1');
    assert.strictEqual(finishA.data.khitmahFinished, true);
    assert.strictEqual(finishA.data.totalCompletedKhitmahs, 1);

    const boardA = await makeRequest('GET', `/api/k/${isoA.data.slug}`);
    const boardB = await makeRequest('GET', `/api/k/${isoB.data.slug}`);
    assert.strictEqual(boardA.data.counter.totalCompleted, 1);
    assert.strictEqual(boardA.data.counter.currentProgress, 0);
    assert.strictEqual(boardA.data.counter.availableCount, 30);
    assert.strictEqual(boardB.data.counter.totalCompleted, 0);
    assert.strictEqual(boardB.data.counter.currentProgress, 0);
    assert.ok(boardB.data.juzList.every(j => j.status === 'available'));

    const finishB = await completeAllCustomJuz(isoB.data.slug, '10.10.2');
    assert.strictEqual(finishB.data.khitmahFinished, true);
    assert.strictEqual(finishB.data.totalCompletedKhitmahs, 1);

    const boardA2 = await makeRequest('GET', `/api/k/${isoA.data.slug}`);
    const boardB2 = await makeRequest('GET', `/api/k/${isoB.data.slug}`);
    assert.strictEqual(boardA2.data.counter.totalCompleted, 1);
    assert.strictEqual(boardB2.data.counter.totalCompleted, 1);
    console.log('[PASS] 16. 30/30 reset increments only that khitmah; two khitmahs stay isolated');

    const delRight = await createKhitmah('Delete Me', '', `del-owner-1-${Date.now()}`, '198.51.100.40');
    const delOk = await makeRequest('DELETE', `/api/k/${delRight.data.slug}`, null, null, null, {
      'x-manage-token': delRight.data.manageToken
    });
    assert.strictEqual(delOk.status, 200);
    const gone = await makeRequest('GET', `/api/k/${delRight.data.slug}`);
    assert.strictEqual(gone.status, 404);

    const delWrong = await createKhitmah('Delete Wrong', '', `del-owner-2-${Date.now()}`, '198.51.100.41');
    const wrong = await makeRequest('DELETE', `/api/k/${delWrong.data.slug}`, null, null, null, {
      'x-manage-token': 'this-is-not-the-manage-token-xx'
    });
    assert.strictEqual(wrong.status, 403);

    const noTok = await makeRequest('DELETE', `/api/k/${delWrong.data.slug}`);
    assert.strictEqual(noTok.status, 403);

    process.env.ADMIN_TOKEN = 'test-admin-token-value';
    const delAdmin = await createKhitmah('Delete Admin', '', `del-owner-3-${Date.now()}`, '198.51.100.42');
    const emptyAdminHeader = await makeRequest('DELETE', `/api/k/${delAdmin.data.slug}`, null, null, null, {
      'x-admin-token': ''
    });
    assert.strictEqual(emptyAdminHeader.status, 403);
    const adminOk = await makeRequest('DELETE', `/api/k/${delAdmin.data.slug}`, null, null, null, {
      'x-admin-token': 'test-admin-token-value'
    });
    assert.strictEqual(adminOk.status, 200);

    process.env.ADMIN_TOKEN = '';
    const delNoAdmin = await createKhitmah('Delete No Admin', '', `del-owner-4-${Date.now()}`, '198.51.100.43');
    const adminDisabled = await makeRequest('DELETE', `/api/k/${delNoAdmin.data.slug}`, null, null, null, {
      'x-admin-token': 'test-admin-token-value'
    });
    assert.strictEqual(adminDisabled.status, 403);
    const emptyBoth = await makeRequest('DELETE', `/api/k/${delNoAdmin.data.slug}`, null, null, null, {
      'x-admin-token': ''
    });
    assert.strictEqual(emptyBoth.status, 403);
    console.log('[PASS] 17. Delete: right token, wrong token, no token, admin set/unset');

    const mainAfter = await makeRequest('GET', '/api/juz');
    assert.strictEqual(mainAfter.status, 200);
    assert.strictEqual(mainAfter.data.juzList.length, 30);
    assert.strictEqual(mainAfter.data.counter.totalCompleted, mainTotal);
    assert.strictEqual(mainAfter.data.counter.currentProgress, mainProgress);
    assert.ok(!('personName' in mainAfter.data) || mainAfter.data.personName === undefined);
    console.log('[PASS] 18. Main /api/juz board unchanged after custom khitmah activity');

    const wsCustom = await createKhitmah('WS Custom', '', `ws-owner-${Date.now()}`, '198.51.100.60');
    const customListener = await connectBoardListener();
    const wsReadCustom = await makeRequest(
      'POST',
      `/api/k/${wsCustom.data.slug}/juz/7/read`,
      {},
      `ws-custom-reader-${Date.now()}`,
      '198.51.100.61'
    );
    assert.strictEqual(wsReadCustom.status, 200);
    const customMsg = await customListener.message;
    assert.strictEqual(customMsg.data.slug, wsCustom.data.slug);
    console.log('[PASS] 19. Custom WebSocket BOARD_UPDATE includes slug');

    const mainListener = await connectBoardListener();
    const wsReadMain = await makeRequest(
      'POST',
      '/api/juz/5/read',
      {},
      `ws-main-reader-${Date.now()}`,
      '198.51.100.62'
    );
    assert.strictEqual(wsReadMain.status, 200);
    const mainMsg = await mainListener.message;
    assert.ok(!mainMsg.data.slug);
    console.log('[PASS] 20. Main WebSocket BOARD_UPDATE does not include slug');

    const spaNew = await makeRequest('GET', '/new');
    const spaCustom = await makeRequest('GET', '/k/x');
    const spaGeneral = await makeRequest('GET', '/general');
    const spaLooksLikeIndex = (res) =>
      res.status === 200 &&
      typeof res.raw === 'string' &&
      res.raw.includes('<div id="root">') &&
      /index\.html|root|Khitmah|خَتْمَة|Ikhtim|اختم/i.test(res.raw);

    if (spaLooksLikeIndex(spaNew) && spaLooksLikeIndex(spaCustom) && spaLooksLikeIndex(spaGeneral)) {
      console.log('[PASS] 21. SPA fallback returns index.html for /new, /general and /k/x');
    } else {
      throw new Error(
        `SPA fallback missing index.html (GET /new status=${spaNew.status}, GET /general status=${spaGeneral.status}, GET /k/x status=${spaCustom.status}). Build the client first.`
      );
    }

    // --- STAGE 4: GLOBAL STATS TESTS ---
    // 22. GET /api/stats initial shape & exact fields
    const statsInitial = await makeRequest('GET', '/api/stats');
    assert.strictEqual(statsInitial.status, 200);
    const keys = Object.keys(statsInitial.data).sort();
    assert.deepStrictEqual(keys, ['customCompleted', 'globalCompleted', 'khitmahsCreated', 'mainCompleted'].sort());
    assert.strictEqual(typeof statsInitial.data.globalCompleted, 'number');
    assert.strictEqual(typeof statsInitial.data.mainCompleted, 'number');
    assert.strictEqual(typeof statsInitial.data.customCompleted, 'number');
    assert.strictEqual(typeof statsInitial.data.khitmahsCreated, 'number');
    assert.strictEqual(statsInitial.data.globalCompleted, statsInitial.data.mainCompleted + statsInitial.data.customCompleted);
    const prevCreated = statsInitial.data.khitmahsCreated;
    const prevCustomCompleted = statsInitial.data.customCompleted;
    const prevGlobal = statsInitial.data.globalCompleted;
    console.log('[PASS] 22. /api/stats returns exactly 4 expected numeric fields and consistent sum');

    // 23. Creating a new khitmah increments khitmahsCreated, but not customCompleted or globalCompleted
    const statsTestKhitmah = await createKhitmah('Stats Test Page', '', `stats-dev-${Date.now()}`, '198.51.100.80');
    assert.strictEqual(statsTestKhitmah.status, 201);
    
    // Clear in-memory stats cache by waiting or testing DB directly / checking endpoint after TTL
    // In stats.js TTL is 5000ms. We can sleep 5100ms to let cache expire.
    await new Promise(r => setTimeout(r, 5200));
    const statsAfterCreate = await makeRequest('GET', '/api/stats');
    assert.strictEqual(statsAfterCreate.status, 200);
    assert.strictEqual(statsAfterCreate.data.khitmahsCreated, prevCreated + 1);
    assert.strictEqual(statsAfterCreate.data.customCompleted, prevCustomCompleted);
    assert.strictEqual(statsAfterCreate.data.globalCompleted, prevGlobal);
    console.log('[PASS] 23. Creating custom khitmah increments khitmahsCreated atomically');

    // 24. Partial progress (e.g. 1-29 juz) does NOT increment globalCompleted or customCompleted
    for (let j = 1; j <= 29; j++) {
      const readRes = await makeRequest(
        'POST',
        `/api/k/${statsTestKhitmah.data.slug}/juz/${j}/read`,
        {},
        `stats-reader-${j}-${Date.now()}`,
        `198.51.100.${80 + j}`
      );
      assert.strictEqual(readRes.status, 200);
    }
    await new Promise(r => setTimeout(r, 5200));
    const statsPartial = await makeRequest('GET', '/api/stats');
    assert.strictEqual(statsPartial.data.customCompleted, prevCustomCompleted);
    assert.strictEqual(statsPartial.data.globalCompleted, prevGlobal);
    console.log('[PASS] 24. Partial progress (29/30) does NOT increment globalCompleted');

    // 25. Completing 30/30 increments customCompleted and globalCompleted by exactly 1
    const read30 = await makeRequest(
      'POST',
      `/api/k/${statsTestKhitmah.data.slug}/juz/30/read`,
      {},
      `stats-reader-30-${Date.now()}`,
      '198.51.100.120'
    );
    assert.strictEqual(read30.status, 200);
    await new Promise(r => setTimeout(r, 5200));
    const statsAfter30 = await makeRequest('GET', '/api/stats');
    assert.strictEqual(statsAfter30.data.customCompleted, prevCustomCompleted + 1);
    assert.strictEqual(statsAfter30.data.globalCompleted, prevGlobal + 1);
    console.log('[PASS] 25. Completing 30/30 increments globalCompleted and customCompleted by exactly 1');

    // 26. Two simultaneous / concurrent completions give +2
    const c1 = await createKhitmah('Concurrent 1', '', `c1-dev-${Date.now()}`, '198.51.100.130');
    const c2 = await createKhitmah('Concurrent 2', '', `c2-dev-${Date.now()}`, '198.51.100.131');
    for (let j = 1; j <= 29; j++) {
      await makeRequest('POST', `/api/k/${c1.data.slug}/juz/${j}/read`, {}, `c1-r-${j}`, `198.51.101.${j}`);
      await makeRequest('POST', `/api/k/${c2.data.slug}/juz/${j}/read`, {}, `c2-r-${j}`, `198.51.102.${j}`);
    }
    // Complete 30th juz simultaneously
    const [resC1, resC2] = await Promise.all([
      makeRequest('POST', `/api/k/${c1.data.slug}/juz/30/read`, {}, `c1-r-30`, '198.51.101.30'),
      makeRequest('POST', `/api/k/${c2.data.slug}/juz/30/read`, {}, `c2-r-30`, '198.51.102.30')
    ]);
    assert.strictEqual(resC1.status, 200);
    assert.strictEqual(resC2.status, 200);
    await new Promise(r => setTimeout(r, 5200));
    const statsAfterConcurrent = await makeRequest('GET', '/api/stats');
    assert.strictEqual(statsAfterConcurrent.data.customCompleted, prevCustomCompleted + 3);
    assert.strictEqual(statsAfterConcurrent.data.globalCompleted, prevGlobal + 3);
    console.log('[PASS] 26. Two simultaneous completions result in +2 to global count');

    // 27. Deleting a khitmah page does NOT decrease global counters
    const delRes = await makeRequest(
      'DELETE',
      `/api/k/${statsTestKhitmah.data.slug}`,
      null,
      null,
      null,
      { 'x-manage-token': statsTestKhitmah.data.manageToken }
    );
    assert.strictEqual(delRes.status, 200);
    await new Promise(r => setTimeout(r, 5200));
    const statsAfterDelete = await makeRequest('GET', '/api/stats');
    assert.strictEqual(statsAfterDelete.data.customCompleted, prevCustomCompleted + 3);
    assert.strictEqual(statsAfterDelete.data.globalCompleted, prevGlobal + 3);
    assert.ok(statsAfterDelete.data.khitmahsCreated >= prevCreated + 3);
    // --- BILINGUAL NAMES TESTS ---
    // 28. Creating with both personNameAr and personNameEn succeeds and returns both
    const biCreate = await makeRequest(
      'POST',
      '/api/k',
      { personNameAr: 'محمد علي', personNameEn: 'Muhammad Ali', dedication: 'دعاء له' },
      'bi-device-1',
      '198.51.100.201'
    );
    assert.strictEqual(biCreate.status, 201);
    assert.ok(biCreate.data.slug);
    assert.ok(biCreate.data.manageToken);

    const biBoard = await makeRequest('GET', `/api/k/${biCreate.data.slug}`);
    assert.strictEqual(biBoard.status, 200);
    assert.strictEqual(biBoard.data.personNameAr, 'محمد علي');
    assert.strictEqual(biBoard.data.personNameEn, 'Muhammad Ali');
    assert.strictEqual(biBoard.data.personName, 'محمد علي');
    assertNoLeakedFields(biBoard.data);
    console.log('[PASS] 28. Creating khitmah with both Arabic and English names succeeds and returns both without leaking private fields');

    // 29. Missing one name when personName is not provided returns 400
    const missingEn = await makeRequest(
      'POST',
      '/api/k',
      { personNameAr: 'محمد علي', personNameEn: '' },
      'bi-device-2',
      '198.51.100.202'
    );
    assert.strictEqual(missingEn.status, 400);

    const missingAr = await makeRequest(
      'POST',
      '/api/k',
      { personNameAr: '', personNameEn: 'Muhammad Ali' },
      'bi-device-3',
      '198.51.100.203'
    );
    assert.strictEqual(missingAr.status, 400);
    console.log('[PASS] 29. Missing one bilingual name when personName is not provided returns 400');

    // 30. Old-style personName fallback fills both personNameAr and personNameEn
    const legacyCreate = await makeRequest(
      'POST',
      '/api/k',
      { personName: 'Legacy Name Only' },
      'bi-device-4',
      '198.51.100.204'
    );
    assert.strictEqual(legacyCreate.status, 201);
    const legacyBoard = await makeRequest('GET', `/api/k/${legacyCreate.data.slug}`);
    assert.strictEqual(legacyBoard.status, 200);
    assert.strictEqual(legacyBoard.data.personNameAr, 'Legacy Name Only');
    assert.strictEqual(legacyBoard.data.personNameEn, 'Legacy Name Only');
    assert.strictEqual(legacyBoard.data.personName, 'Legacy Name Only');
    console.log('[PASS] 30. Old-style personName fallback fills both bilingual columns');
  } catch (err) {
    console.error('[FAIL] Test failed:', err);
    await cleanup();
    process.exit(1);
  }

  await cleanup();
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('[FAIL] Test runner failed:', err);
  await cleanup();
  process.exit(1);
});
