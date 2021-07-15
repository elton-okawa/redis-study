const Redis = require('ioredis');
const redis = new Redis();

redis.defineCommand("allocate", {
  numberOfKeys: 4,
  lua: `
    local safety = KEYS[1]
    local groupListKey = KEYS[2]
    local groupHashKey = KEYS[3]
    local lastGroupKey = KEYS[4]
    local baseGroupKey = ARGV[1]
    local maxGroupSize = tonumber(ARGV[2])
    
    if (redis.call('exists', safety) == 1) then
      
      local groupNumber = redis.call('lrange', groupListKey, 0, 0)[1];
      local groupKey = baseGroupKey .. '-' .. groupNumber

      local pos = redis.call('hincrby', groupHashKey, groupKey, 1)
      if (pos >= maxGroupSize) then
        local newGroup = redis.call('incr', lastGroupKey)
        redis.call('lpush', groupListKey, newGroup)
      end
      return pos
    end
  `,
});

(async function() {
  /* setup
  
SET safe ok 
INCR last-group 
LPUSH group-list 1 

  */

  // hash table -> tira a necessidade de saber a chave em compile time
  // não precisa ser mais um array de grupos

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