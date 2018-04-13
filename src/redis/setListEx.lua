local key = KEYS[1]
local expiration = KEYS[2]
redis.call('rpush', key, unpack(ARGV))
redis.call('expire', key, expiration);
return key