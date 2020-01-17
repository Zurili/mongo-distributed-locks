const _ = require('lodash');
const Promise = require('bluebird');
const uuidv4 = require('uuid/v4');

const Lock = require('mongoose').model('lock');

const RETRY_INTERVAL_RANGE = {
  min: 100,
  max: 1000
};
const DUPLICATE_KEY_ERROR = 11000;

class DLocks {
  static registerLoggerErrorFn(loggerErrorFn) {
    DLocks.loggerErrorFn = loggerErrorFn;
  }

  static exec(params) {
    let instance = new DLocks(params);
    return instance.exec();
  }

  static lock(params) {
    let instance = new DLocks(params);
    return instance._doLock();
  }

  static unlock({ name, uid } = {}) {
    let instance = new DLocks();
    instance.name = name;
    instance.uid = uid;
    return instance._releaseLock();
  }

  constructor({ resource, id, fn } = {}) {
    this.name = `${resource}-${id}`;
    this.uid = uuidv4();
    this.fn = fn;
  }

  async exec() {
    try {
      await this._doLock();
      let res = await this.fn();
      return res;
    } catch (err) {
      DLocks.loggerErrorFn('DLocks error. The error can be related to DLocks itself or to the locked function', err);
      throw err;
    } finally {
      await this._releaseLock();
    }
  }

  async _doLock() {
    let lock = await this._createLock();
    if (lock) {
      return lock;
    }
    await this._wait();
    return this._doLock();
  }

  async _createLock() {
    let lock = await Lock.findOne({ name: this.name });
    if (lock) {
      return null;
    }
    try {
      await Lock.create({ name: this.name, uid: this.uid });
      lock = await this._confirmLock();
      return lock;
    } catch (err) {
      if (err.code === DUPLICATE_KEY_ERROR) {
        return null;
      }
      throw err;
    }
  }

  _confirmLock() {
    return Lock.findOne({ name: this.name, uid: this.uid });
  }

  async _releaseLock() {
    let lock = await Lock.findOne({ name: this.name, uid: this.uid });
    if (!lock) {
      DLocks.loggerErrorFn('DLocks error. Lock not found', { name: this.name, uid: this.uid });
      return;
    }
    return lock.remove();
  }

  _wait() {
    let delay = _.random(RETRY_INTERVAL_RANGE.min, RETRY_INTERVAL_RANGE.max);
    return Promise.delay(delay);
  }
}

// eslint-disable-next-line no-console
DLocks.loggerErrorFn = console.error.bind(console);

module.exports = DLocks;
