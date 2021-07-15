const Redis = require('ioredis');
const redis = new Redis();

redis.defineCommand("allocate", {
  numberOfKeys: 3,
  lua: `
    local start = redis.call('TIME')

    local safety = KEYS[1]
    local groupHashKey = KEYS[2]
    local lastGroupKey = KEYS[3]
    local baseGroupKey = ARGV[1]
    local maxGroupSize = tonumber(ARGV[2])
    
    local pos
    if (redis.call('exists', safety) == 1) then

      if (redis.call('exists', lastGroupKey) == 0) then
        redis.call('incr', lastGroupKey)
      end

      local groupNumber = redis.call('get', lastGroupKey)
      local groupKey = baseGroupKey .. '-' .. groupNumber

      pos = redis.call('hincrby', groupHashKey, groupKey, 1)

      redis.log(redis.LOG_NOTICE, pos)
      redis.log(redis.LOG_NOTICE, maxGroupSize)

      if (pos >= maxGroupSize) then
        redis.call('incr', lastGroupKey)
      end
    end

    local finish = redis.call('TIME')
    redis.log(redis.LOG_NOTICE, start[1] .. ' ' .. start[2])
    redis.log(redis.LOG_NOTICE, finish[1] .. ' ' .. finish[2])
    local elapsedTimeUs = tonumber(finish[1]-start[1]) / 1000000 + tonumber(finish[2]-start[2])
    redis.log(redis.LOG_NOTICE, 'Execution time: ' .. elapsedTimeUs .. 'us')

    return pos
  `,
});

(async function() {
  /* setup
  
SET safe ok 

  */

  // hash table -> tira a necessidade de saber a chave em compile time

  const baseGroupKey = 'group';
  const lastGroupKey = 'last-group';
  const groupHashKey = 'group-hash';
  const safeKey = 'safe';

  const pos = await redis.allocate(safeKey, groupHashKey, lastGroupKey, baseGroupKey, 3)
  
  if (pos !== null) {
    console.log('Position: ' + pos);
    
    const lastGroup = await redis.get(lastGroupKey);
    const groupHash = await redis.hgetall(groupHashKey);
    console.log('GroupHash: ', groupHash);
    console.log('LastGroup: ' + lastGroup);
  } else {
    console.log('Maintenance');
  }
  

  process.exit();
})();