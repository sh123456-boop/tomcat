import ws from 'k6/ws';
import { check } from 'k6';
import exec from 'k6/execution';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

const WS_URL = __ENV.WS_URL || 'ws://172.31.58.37:8080/ws/echo';
const MESSAGE_INTERVAL_MS = Number(__ENV.MESSAGE_INTERVAL_MS || 300);
const SESSION_MS = Number(__ENV.SESSION_MS || 90000);

export const ws_rtt = new Trend('ws_rtt', true);
export const ws_connect_success = new Rate('ws_connect_success');
export const ws_message_error_rate = new Rate('ws_message_error_rate');
export const ws_message_errors = new Counter('ws_message_errors');
export const ws_active_vus_on_success = new Gauge('ws_active_vus_on_success');

export const options = {
  scenarios: {
    ws_chat_like_extreme: {
      executor: 'ramping-vus',
      startVUs: Number(__ENV.START_VUS || 200),
      stages: [
        { duration: __ENV.STAGE_1 || '2m', target: Number(__ENV.TARGET_VUS_1 || 800) },
        { duration: __ENV.STAGE_2 || '2m', target: Number(__ENV.TARGET_VUS_2 || 1600) },
        { duration: __ENV.STAGE_3 || '2m', target: Number(__ENV.TARGET_VUS_3 || 2600) },
        { duration: __ENV.STAGE_4 || '2m', target: Number(__ENV.TARGET_VUS_4 || 3600) },
        { duration: __ENV.STAGE_5 || '2m', target: Number(__ENV.TARGET_VUS_5 || 4600) },
        { duration: __ENV.STAGE_6 || '2m', target: Number(__ENV.TARGET_VUS_6 || 5600) },
        { duration: __ENV.STAGE_7 || '90s', target: Number(__ENV.TARGET_VUS_7 || 6200) },
      ],
      gracefulRampDown: __ENV.GRACEFUL_RAMP_DOWN || '45s',
      gracefulStop: __ENV.GRACEFUL_STOP || '45s',
    },
  },
  thresholds: {
    ws_connect_success: [{ threshold: 'rate>0.97', abortOnFail: true, delayAbortEval: '45s' }],
    ws_message_error_rate: [{ threshold: 'rate<0.03', abortOnFail: true, delayAbortEval: '45s' }],
    ws_rtt: [{ threshold: 'p(95)<1200', abortOnFail: true, delayAbortEval: '45s' }],
  },
};

export default function () {
  const pending = new Map();
  let sequence = 0;

  const res = ws.connect(WS_URL, {}, function (socket) {
    socket.on('open', () => {
      ws_active_vus_on_success.add(exec.instance.vusActive);

      socket.setInterval(() => {
        sequence += 1;
        const id = `${__VU}-${__ITER}-${sequence}`;
        const sentAt = Date.now();
        pending.set(id, sentAt);

        socket.send(JSON.stringify({ id, sentAt, body: 'ping' }));
      }, MESSAGE_INTERVAL_MS);

      socket.setTimeout(() => {
        socket.close();
      }, SESSION_MS);
    });

    socket.on('message', (message) => {
      const raw = typeof message === 'string' ? message : '';
      const text = raw.startsWith('echo:') ? raw.slice(5) : raw;

      try {
        const data = JSON.parse(text);
        if (!data.id || !pending.has(data.id)) {
          ws_message_errors.add(1);
          ws_message_error_rate.add(1);
          return;
        }

        ws_rtt.add(Date.now() - pending.get(data.id));
        ws_message_error_rate.add(0);
        ws_active_vus_on_success.add(exec.instance.vusActive);
        pending.delete(data.id);
      } catch (_) {
        ws_message_errors.add(1);
        ws_message_error_rate.add(1);
      }
    });

    socket.on('error', () => {
      ws_message_errors.add(1);
      ws_message_error_rate.add(1);
    });
  });

  const ok = check(res, {
    'ws upgrade status is 101': (r) => r && r.status === 101,
  });
  ws_connect_success.add(ok);
}
