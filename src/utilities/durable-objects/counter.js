/**
 * Counter Durable Object
 * Simple atomic counter with history
 * 
 * @example
 * const id = env.COUNTER.idFromName('page-views');
 * const counter = env.COUNTER.get(id);
 * const response = await counter.fetch(new Request('https://counter/increment'));
 */

import { DurableObjectBase } from './base.js';

export class Counter extends DurableObjectBase {
  async fetch(request) {
    await this.ensureInitialized();
    
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();

    switch (action) {
      case 'increment':
        return this.increment(request);
      case 'decrement':
        return this.decrement(request);
      case 'set':
        return this.set(request);
      case 'reset':
        return this.reset();
      case 'history':
        return this.getHistory();
      default:
        return this.getValue();
    }
  }

  async getValue() {
    const value = await this.getState('value', 0);
    return this.json({ value });
  }

  async increment(request) {
    const url = new URL(request.url);
    const amount = parseInt(url.searchParams.get('amount')) || 1;
    
    return this.transaction(async () => {
      let value = await this.getState('value', 0);
      value += amount;
      await this.setState('value', value);
      await this.recordHistory('increment', amount, value);
      return this.json({ value, change: amount });
    });
  }

  async decrement(request) {
    const url = new URL(request.url);
    const amount = parseInt(url.searchParams.get('amount')) || 1;
    
    return this.transaction(async () => {
      let value = await this.getState('value', 0);
      value -= amount;
      await this.setState('value', value);
      await this.recordHistory('decrement', -amount, value);
      return this.json({ value, change: -amount });
    });
  }

  async set(request) {
    const url = new URL(request.url);
    const newValue = parseInt(url.searchParams.get('value'));
    
    if (isNaN(newValue)) {
      return this.error('Invalid value', 400);
    }

    return this.transaction(async () => {
      const oldValue = await this.getState('value', 0);
      await this.setState('value', newValue);
      await this.recordHistory('set', newValue - oldValue, newValue);
      return this.json({ value: newValue, previousValue: oldValue });
    });
  }

  async reset() {
    return this.transaction(async () => {
      const oldValue = await this.getState('value', 0);
      await this.setState('value', 0);
      await this.recordHistory('reset', -oldValue, 0);
      return this.json({ value: 0, previousValue: oldValue });
    });
  }

  async recordHistory(action, change, newValue) {
    const history = await this.getState('history', []);
    history.push({
      action,
      change,
      value: newValue,
      timestamp: Date.now()
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
    
    await this.setState('history', history);
  }

  async getHistory() {
    const history = await this.getState('history', []);
    const value = await this.getState('value', 0);
    return this.json({ currentValue: value, history });
  }
}

export default Counter;
