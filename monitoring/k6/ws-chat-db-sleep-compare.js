import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const WS_URL = __ENV.WS_URL || 'ws://172.31.51.38:8080/ws/chat';
const ROOM_PREFIX = __ENV.ROOM_PREFIX || 'sleep-room';
const LIMIT = Number(__ENV.LIMIT || 1);
const SLEEP_MS = Number(__ENV.SLEEP_MS || 50);

export const ws_connect_success = new Rate('ws_connect_success');
export const ws_save_success = new Rate('ws_save_success');
export const ws_read_success = new Rate('ws_read_success');
export const ws_message_error_rate = new Rate('ws_message_error_rate');
export const ws_save_rtt = new Trend('ws_save_rtt', true);
export const ws_read_rtt = new Trend('ws_read_rtt', true);
export const ws_total_rtt = new Trend('ws_total_rtt', true);
export const ws_errors = new Counter('ws_errors');

export const options = {
  scenarios: {
    ws_chat_db_sleep_compare: {
      executor: 'ramping-vus',
      startVUs: Number(__ENV.START_VUS || 30),
      stages: [
        { duration: __ENV.STAGE_1 || '1m', target: Number(__ENV.TARGET_VUS_1 || 120) },
        { duration: __ENV.STAGE_2 || '1m', target: Number(__ENV.TARGET_VUS_2 || 250) },
        { duration: __ENV.STAGE_3 || '1m', target: Number(__ENV.TARGET_VUS_3 || 450) },
        { duration: __ENV.STAGE_4 || '1m', target: Number(__ENV.TARGET_VUS_4 || 700) },
        { duration: __ENV.STAGE_5 || '40s', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
  },
  thresholds: {
    ws_connect_success: [{ threshold: 'rate>0.99', abortOnFail: true, delayAbortEval: '30s' }],
    ws_save_success: [{ threshold: 'rate>0.95', abortOnFail: true, delayAbortEval: '30s' }],
    ws_read_success: [{ threshold: 'rate>0.95', abortOnFail: true, delayAbortEval: '30s' }],
    ws_message_error_rate: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
    ws_save_rtt: [{ threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '30s' }],
    ws_read_rtt: [{ threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '30s' }],
  },
};

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export default function () {
  const roomId = `${ROOM_PREFIX}-${__VU}-${__ITER}`;
  const sender = `vu-${__VU}`;
  const text = `sleep-${SLEEP_MS}-vu-${__VU}-iter-${__ITER}-${Date.now()}`;

  let saveSentAt = 0;
  let readSentAt = 0;
  let totalStartedAt = 0;
  let saveDone = false;
  let readDone = false;

  const res = ws.connect(WS_URL, {}, (socket) => {
    socket.on('open', () => {
      const savePayload = JSON.stringify({
        action: 'save',
        roomId,
        sender,
        message: text,
        sleepMs: SLEEP_MS,
      });
      totalStartedAt = Date.now();
      saveSentAt = totalStartedAt;
      socket.send(savePayload);
    });

    socket.on('message', (message) => {
      const raw = typeof message === 'string' ? message : '';
      const parsed = parseJsonSafe(raw);

      if (!parsed || parsed.status !== 'ok') {
        ws_errors.add(1);
        ws_message_error_rate.add(1);
        return;
      }

      if (parsed.action === 'save') {
        ws_save_rtt.add(Date.now() - saveSentAt);
        const ok = !!(parsed.message && parsed.message.roomId === roomId && parsed.message.message === text);
        ws_save_success.add(ok);
        ws_message_error_rate.add(ok ? 0 : 1);

        if (ok) {
          const readPayload = JSON.stringify({
            action: 'read',
            roomId,
            limit: LIMIT,
            sleepMs: SLEEP_MS,
          });
          readSentAt = Date.now();
          saveDone = true;
          socket.send(readPayload);
        }
        return;
      }

      if (parsed.action === 'read') {
        ws_read_rtt.add(Date.now() - readSentAt);
        ws_total_rtt.add(Date.now() - totalStartedAt);

        const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
        const found = messages.some((m) => m && m.roomId === roomId && m.sender === sender && m.message === text);
        ws_read_success.add(found);
        ws_message_error_rate.add(found ? 0 : 1);
        readDone = true;
        socket.close();
      }
    });

    socket.on('error', () => {
      ws_errors.add(1);
      ws_message_error_rate.add(1);
    });

    socket.setTimeout(() => {
      if (!saveDone || !readDone) {
        ws_errors.add(1);
        ws_message_error_rate.add(1);
      }
      socket.close();
    }, Number(__ENV.SESSION_TIMEOUT_MS || 30000));
  });

  const connected = check(res, {
    'ws upgrade status is 101': (r) => r && r.status === 101,
  });
  ws_connect_success.add(connected);
}
