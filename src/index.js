const Redis = require('ioredis');
const redis = new Redis();

redis.defineCommand("allocate", {
  numberOfKeys: 4,
  lua: `
    local safety = KEYS[1]
    local groupKey = KEYS[2]
    local lastGroupKey = KEYS[3]
    local groupListKey = KEYS[4]    
    local maxGroupSize = tonumber(ARGV[1])
    
    if (redis.call('exists', safety) == 1) then
      local pos = redis.call('incr', groupKey)
      if (pos >= maxGroupSize) then
        local newGroup = redis.call('incr', lastGroupKey)
        redis.call('lpush', groupListKey, newGroup)
      end
      return pos
    end
  `,
});

(async function() {
  // setup
  // SET safe ok
  // INCR last-group
  // LPUSH group-list 1

  const baseGroupKey = 'group';
  const lastGroupKey = 'last-group';
  const groupListKey = 'group-list'
  const safeKey = 'safe';

  const groupNumber = await redis.lrange(groupListKey, 0, 0);
  const groupKey = `${baseGroupKey}-${groupNumber}`;
  const pos = await redis.allocate(safeKey, groupKey, lastGroupKey, groupListKey, 3)
  
  if (pos) {
    console.log('Position: ' + pos);
    console.log('GroupKey: ' + groupKey);
    
    const lastGroup = await redis.get(lastGroupKey);
    const groupList = await redis.lrange(groupListKey, 0, -1);
    console.log('LastGroup: ' + lastGroup);
    console.log('GroupList: ' + groupList);
  } else {
    console.log('Maintenance');
  }
  

  process.exit();
})();