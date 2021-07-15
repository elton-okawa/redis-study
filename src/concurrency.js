const Redis = require('ioredis');
const redis = new Redis();

async function allocate(client) {

  log(client, 'Before verification');
  const safe = await redis.get('safe');
  
  if (safe) {
    log(client, 'After verification');
    const pos = await redis.incr('group');
    log(client, `Received pos: ${pos}`);
  }
}

function log(client, message) {
  console.log(`[${client}] ${message}`);
}

(async function() {
  await redis.set('safe', 'ok');

  const clientA = 'A';
  log(clientA, 'Issues a request');
  allocate(clientA);

  const clientB = 'B';
  log(clientB, 'Issues a request');
  allocate(clientB);
})();