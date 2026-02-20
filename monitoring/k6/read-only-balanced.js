import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://172.31.54.19:8080';
const SLEEP_MS = Number(__ENV.SLEEP_MS || 80);
const ID_MIN = Number(__ENV.ID_MIN || 1);
const ID_MAX = Number(__ENV.ID_MAX || 1000);

// Balanced profile for fair comparison across servers.
export const options = {
  discardResponseBodies: true,
  scenarios: {
    read_burst: {
      executor: 'ramping-arrival-rate',
      startRate: Number(__ENV.START_RPS || 10),
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 120),
      maxVUs: Number(__ENV.MAX_VUS || 1000),
      stages: [
        { duration: __ENV.STAGE_1 || '90s', target: Number(__ENV.TARGET_RPS_1 || 20) },
        { duration: __ENV.STAGE_2 || '90s', target: Number(__ENV.TARGET_RPS_2 || 30) },
        { duration: __ENV.STAGE_3 || '90s', target: Number(__ENV.TARGET_RPS_3 || 40) },
        { duration: __ENV.STAGE_4 || '90s', target: Number(__ENV.TARGET_RPS_4 || 55) },
        { duration: __ENV.STAGE_5 || '90s', target: Number(__ENV.TARGET_RPS_5 || 70) },
        { duration: __ENV.STAGE_6 || '90s', target: Number(__ENV.TARGET_RPS_6 || 85) },
        { duration: __ENV.STAGE_7 || '90s', target: Number(__ENV.TARGET_RPS_7 || 100) },
        { duration: __ENV.STAGE_8 || '90s', target: Number(__ENV.TARGET_RPS_8 || 120) },
      ],
      gracefulStop: '10s',
      tags: { scenario: 'read-only-balanced' },
    },
  },
  thresholds: {
    http_req_failed: [
      {
        threshold: `rate<${Number(__ENV.STOP_FAIL_RATE || 0.10)}`,
        abortOnFail: true,
        delayAbortEval: __ENV.STOP_DELAY || '60s',
      },
    ],
    http_req_duration: ['p(95)<10000'],
  },
};

const ids = new SharedArray('ids', () => {
  const arr = [];
  for (let i = ID_MIN; i <= ID_MAX; i += 1) arr.push(i);
  return arr;
});

export default function () {
  const id = ids[Math.floor(Math.random() * ids.length)];
  const url = `${BASE_URL}/api/v1/io/db/read?id=${id}&sleepMs=${SLEEP_MS}`;

  const res = http.get(url, {
    tags: { endpoint: 'read' },
    timeout: __ENV.REQ_TIMEOUT || '30s',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
