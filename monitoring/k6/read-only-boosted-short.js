import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://172.31.58.37:8080';
const SLEEP_MS = Number(__ENV.SLEEP_MS || 80);
const ID_MIN = Number(__ENV.ID_MIN || 1);
const ID_MAX = Number(__ENV.ID_MAX || 1000);

// Higher load than balanced, shorter total duration.
export const options = {
  discardResponseBodies: true,
  scenarios: {
    read_burst: {
      executor: 'ramping-arrival-rate',
      startRate: Number(__ENV.START_RPS || 20),
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 180),
      maxVUs: Number(__ENV.MAX_VUS || 1200),
      stages: [
        { duration: __ENV.STAGE_1 || '45s', target: Number(__ENV.TARGET_RPS_1 || 40) },
        { duration: __ENV.STAGE_2 || '45s', target: Number(__ENV.TARGET_RPS_2 || 60) },
        { duration: __ENV.STAGE_3 || '45s', target: Number(__ENV.TARGET_RPS_3 || 80) },
        { duration: __ENV.STAGE_4 || '45s', target: Number(__ENV.TARGET_RPS_4 || 110) },
        { duration: __ENV.STAGE_5 || '45s', target: Number(__ENV.TARGET_RPS_5 || 140) },
        { duration: __ENV.STAGE_6 || '45s', target: Number(__ENV.TARGET_RPS_6 || 170) },
        { duration: __ENV.STAGE_7 || '45s', target: Number(__ENV.TARGET_RPS_7 || 200) },
        { duration: __ENV.STAGE_8 || '45s', target: Number(__ENV.TARGET_RPS_8 || 230) },
      ],
      gracefulStop: '10s',
      tags: { scenario: 'read-only-boosted-short' },
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
