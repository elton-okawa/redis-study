const Redis = require('ioredis');
const redis = new Redis();

redis.defineCommand("allocate", {
  numberOfKeys: 4,
  lua: `
    local start = redis.call('TIME')

    local safety = KEYS[1]
    local groupListKey = KEYS[2]
    local groupHashKey = KEYS[3]
    local lastGroupKey = KEYS[4]
    local baseGroupKey = ARGV[1]
    local maxGroupSize = tonumber(ARGV[2])
    
    local pos
    if (redis.call('exists', safety) == 1) then
      
      local groupNumber = redis.call('lrange', groupListKey, 0, 0)[1];
      local groupKey = baseGroupKey .. '-' .. groupNumber

      pos = redis.call('hincrby', groupHashKey, groupKey, 1)
      if (pos >= maxGroupSize) then
        local newGroup = redis.call('incr', lastGroupKey)
        redis.call('lpush', groupListKey, newGroup)
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
INCR last-group 
LPUSH group-list 1 

  */

  // hash table -> tira a necessidade de saber a chave em compile time
  // TODO não precisa ser mais um array de grupos

  const baseGroupKey = 'group';
  const groupListKey = 'group-list';
  const lastGroupKey = 'last-group';
  const groupHashKey = 'group-hash';
  const safeKey = 'safe';

  const pos = await redis.allocate(safeKey, groupListKey, groupHashKey, lastGroupKey, baseGroupKey, 3)
  
  if (pos !== null) {
    console.log('Position: ' + pos);
    
    
    const lastGroup = await redis.get(lastGroupKey);
    const groupList = await redis.lrange(groupListKey, 0, -1);
    const groupHash = await redis.hgetall(groupHashKey);
    console.log('GroupHash: ', groupHash);
    console.log('LastGroup: ' + lastGroup);
    console.log('GroupList: ', groupList);
  } else {
    console.log('Maintenance');
  }
  

  process.exit();
})();