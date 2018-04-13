local key = KEYS[1]
local expiration = KEYS[2]
local exists = redis.call('exists', key)
redis.call('rpush', key, unpack(ARGV))
if (exists == 0) then 
    redis.call('expire', key, expiration)
end
return 0