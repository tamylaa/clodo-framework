/**
 * Leaderboard using Redis sorted sets
 * 
 * @example
 * import { Leaderboard, UpstashRedis } from '@tamyla/clodo-framework/utilities/cache';
 * 
 * const redis = new UpstashRedis(env.UPSTASH_URL, env.UPSTASH_TOKEN);
 * const leaderboard = new Leaderboard(redis, 'game-scores');
 * 
 * await leaderboard.setScore('player1', 1000);
 * const top10 = await leaderboard.getTop(10);
 */

export class Leaderboard {
  constructor(redis, name) {
    this.redis = redis;
    this.key = `leaderboard:${name}`;
  }

  async setScore(member, score) {
    await this.redis.zadd(this.key, score, member);
  }

  async incrementScore(member, amount = 1) {
    return this.redis.execute('zincrby', this.key, amount, member);
  }

  async getRank(member) {
    return this.redis.zrank(this.key, member);
  }

  async getScore(member) {
    return this.redis.zscore(this.key, member);
  }

  async getTop(n = 10) {
    const results = await this.redis.zrange(this.key, 0, n - 1, true);
    
    // Parse results into array of { member, score }
    const entries = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({
        member: results[i],
        score: parseFloat(results[i + 1])
      });
    }
    
    return entries.reverse(); // Highest first
  }

  async getAround(member, range = 5) {
    const rank = await this.getRank(member);
    if (rank === null) return null;

    const start = Math.max(0, rank - range);
    const stop = rank + range;

    return this.redis.zrange(this.key, start, stop, true);
  }
}

export default Leaderboard;
