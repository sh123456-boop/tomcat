import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const WS_URL = __ENV.WS_URL || 'ws://127.0.0.1:8080/ws/bench';
const ROOM_ID = __ENV.ROOM_ID || 'k6-room';
const LIMIT = Number(__ENV.LIMIT || 20);

export const ws_connect_success = new Rate('ws_connect_success');
export const ws_save_success = new Rate('ws_save_success');
export const ws_read_success = new Rate('ws_read_success');
export const ws_message_error_rate = new Rate('ws_message_error_rate');
export const ws_save_rtt = new Trend('ws_save_rtt', true);
export const ws_read_rtt = new Trend('ws_read_rtt', true);
export const ws_errors = new Counter('ws_errors');

export const options = {
  scenarios: {
    ws_chat_db: {
      executor: 'ramping-vus',
      startVUs: Number(__ENV.START_VUS || 5),
      stages: [
        { duration: __ENV.STAGE_1 || '30s', target: Number(__ENV.TARGET_VUS_1 || 20) },
        { duration: __ENV.STAGE_2 || '30s', target: Number(__ENV.TARGET_VUS_2 || 50) },
        { duration: __ENV.STAGE_3 || '30s', target: Number(__ENV.TARGET_VUS_3 || 80) },
        { duration: __ENV.STAGE_4 || '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    ws_connect_success: ['rate>0.99'],
    ws_save_success: ['rate>0.97'],
    ws_read_success: ['rate>0.97'],
    ws_message_error_rate: ['rate<0.03'],
    ws_save_rtt: ['p(95)<1500'],
    ws_read_rtt: ['p(95)<1500'],
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
  const sender = `vu-${__VU}`;
  const text = `hello-${__VU}-${__ITER}-${Date.now()}`;

  let saveSentAt = 0;
  let readSentAt = 0;
  let saveDone = false;
  let readDone = false;

  const res = ws.connect(WS_URL, {}, (socket) => {
    socket.on('open', () => {
      const savePayload = JSON.stringify({
        action: 'save',
        roomId: ROOM_ID,
        sender,
        message: text,
      });
      saveSentAt = Date.now();
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
        const ok = !!(parsed.message && parsed.message.roomId === ROOM_ID && parsed.message.message === text);
        ws_save_success.add(ok);
        ws_message_error_rate.add(ok ? 0 : 1);

        if (ok) {
          const readPayload = JSON.stringify({
            action: 'read',
            roomId: ROOM_ID,
            limit: LIMIT,
          });
          readSentAt = Date.now();
          saveDone = true;
          socket.send(readPayload);
        }
        return;
      }

      if (parsed.action === 'read') {
        ws_read_rtt.add(Date.now() - readSentAt);
        const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
        const found = messages.some((m) => m && m.roomId === ROOM_ID && m.sender === sender && m.message === text);
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
    }, Number(__ENV.SESSION_TIMEOUT_MS || 15000));
  });

  const connected = check(res, {
    'ws upgrade status is 101': (r) => r && r.status === 101,
  });
  ws_connect_success.add(connected);
}
