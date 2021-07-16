const Redis = require('ioredis');
const redis = new Redis();

redis.defineCommand("allocate", {
  numberOfKeys: 3,
  lua: `
    local safety = KEYS[1]
    local groupHashKey = KEYS[2]
    local lastGroupKey = KEYS[3]
    local baseGroupKey = ARGV[1]
    local maxGroupSize = tonumber(ARGV[2])
    local expireAt = tonumber(ARGV[3])
    redis.log(redis.LOG_NOTICE, expireAt)

    local pos
    local groupKey
    if (redis.call('exists', safety) == 1) then

      -- Maybe do it on league creation
      if (redis.call('exists', lastGroupKey) == 0) then
        redis.call('incr', lastGroupKey)
        redis.call('expireat', lastGroupKey, expireAt)

        redis.call('hset', groupHashKey, 'name', baseGroupKey)
        redis.call('expireat', groupHashKey, expireAt)
      end

      local groupNumber = redis.call('get', lastGroupKey)
      groupKey = baseGroupKey .. '-' .. groupNumber

      pos = redis.call('hincrby', groupHashKey, groupKey, 1)

      if (pos >= maxGroupSize) then
        redis.call('incr', lastGroupKey)
        redis.call('hdel', groupHashKey, groupKey)
      end

      -- Caution: Lua table array like
      return { groupKey, pos }
    end
  `,
});

(async function() {
  /* setup
  
SET safe ok 

  */

  // hash table -> tira a necessidade de saber a chave em compile time
  // expireAt -> seconds

  const baseGroupKey = 'group';
  const lastGroupKey = 'last-group';
  const groupHashKey = 'group-hash';
  const safeKey = 'safe';

  const expireAt = Math.floor((Date.now() + 60000) / 1000);
  console.log('ExpireAt: ' + expireAt);
  const allocation = await redis.allocate(safeKey, groupHashKey, lastGroupKey, baseGroupKey, 3, expireAt)
  
  if (allocation !== null) {
    console.log('GroupKey: ' + allocation[0]);
    console.log('Position: ' + allocation[1]);
    
    const lastGroup = await redis.get(lastGroupKey);
    const groupHash = await redis.hgetall(groupHashKey);
    console.log('GroupHash: ', groupHash);
    console.log('LastGroup: ' + lastGroup);
  } else {
    console.log('Maintenance');
  }
  

  process.exit();
})();