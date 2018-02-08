'use strict';

const _        = require('lodash');
const mongoose = require('mongoose');
const sinon    = require('sinon');
const nassert  = require('n-assert');
const DLocks   = require('../');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: String,
  balance: Number
});

mongoose.model('user', userSchema);

const User = mongoose.model('user');
const Lock = mongoose.model('lock');

DLocks.registerLoggerErrorFn(() => {});

describe('service', () => {
  function createInstace(ex) {
    let params = { prefix: 'userBalance', objectId: 'userId', fn: () => {} };
    _.extend(params, ex);
    return new DLocks(params);
  }

  describe('exec', () => {
    async function test({ fnRes, expected }) {
      let instance = createInstace();
      sinon.stub(instance, '_doLock').resolves('ok1');
      sinon.stub(instance, '_releaseLock').resolves('ok3');
      if (_.isError(fnRes)) {
        sinon.stub(instance, 'fn').rejects(fnRes);
      } else {
        sinon.stub(instance, 'fn').resolves(fnRes);
      }

      try {
        let actual = await instance.exec();
        nassert.assert(actual, expected);
      } catch (err) {
        if (_.isError(expected)) {
          nassert.assert(err.message, expected.message, true);
        } else {
          throw err;
        }
      }

      nassert.validateCalledFn({ srvc: instance, fnName: '_doLock', expectedArgs: '_without-args_' });
      nassert.validateCalledFn({ srvc: instance, fnName: 'fn', expectedArgs: '_without-args_' });
      nassert.validateCalledFn({ srvc: instance, fnName: '_releaseLock', expectedArgs: '_without-args_' });
    }

    it('should call related methods and catch thrown error', () => {
      let fnRes = new Error('Fn Error');
      let expected = new Error('Fn Error');

      return test({ fnRes, expected });
    });

    it('should call related methods', () => {
      let fnRes = 'data';
      let expected = 'data';

      return test({ fnRes, expected });
    });
  });

  describe('_doLock', () => {
    async function test({ createLockRes1, createLockRes2, expected }) {
      let instance = createInstace();
      sinon.stub(instance, '_createLock')
        .onCall(0).resolves(createLockRes1)
        .onCall(1).resolves(createLockRes2);
      sinon.stub(instance, '_wait').resolves('ok');

      let actual = await instance._doLock();
      nassert.assert(actual, expected);
    }

    it('should call related methods and return after the first call when createLock returned lock on the first iteration', () => {
      let createLockRes1 = { lock: 'lockData' };
      let expected = { lock: 'lockData' };

      return test({ createLockRes1, expected });
    });

    it('should call related methods and return after the second call when createLock returned lock on the second iteration', () => {
      let createLockRes1 = null;
      let createLockRes2 = { lock: 'lockData' };
      let expected = { lock: 'lockData' };

      return test({ createLockRes1, createLockRes2, expected });
    });
  });

  describe('_createLock', () => {
    async function test({ findOneArgs, createArgs, confirmLockArgs, confirmLockRes, expected }) {
      let instance = createInstace();
      if (_.isError(confirmLockRes)) {
        sinon.stub(instance, '_confirmLock').rejects(confirmLockRes);
      } else {
        sinon.stub(instance, '_confirmLock').resolves(confirmLockRes);
      }

      try {
        let actual = await instance._createLock();
        nassert.assert(actual, expected);
      } catch (err) {
        if (_.isError(expected)) {
          nassert.assert(err.message, expected.message, true);
        } else {
          throw err;
        }
      }

      nassert.validateCalledFn({ srvc: Lock, fnName: 'findOne', expectedArgs: findOneArgs });
      nassert.validateCalledFn({ srvc: Lock, fnName: 'create', expectedArgs: createArgs });
      nassert.validateCalledFn({ srvc: instance, fnName: '_confirmLock', expectedArgs: confirmLockArgs });
    }

    beforeEach(() => {
      sinon.stub(Lock, 'findOne');
      sinon.stub(Lock, 'create');
    });

    afterEach(() => {
      Lock.findOne.restore();
      Lock.create.restore();
    });

    it('should return null when lock is already created', () => {
      let findOneArgs = { name: 'userBalance-userId' };
      let expected = null;

      Lock.findOne.resolves({ lock: 'lockData' });

      return test({ findOneArgs, expected });
    });

    it('should catch thrown error and return null when lock doesn\'t exist and thrown error is DuplicateError', () => {
      let findOneArgs = { name: 'userBalance-userId' };
      let createArgs = { name: 'userBalance-userId', uid: '_mock_' };
      let confirmLockArgs = '_without-args_';
      let confirmLockRes = new Error('DuplicateError');
      confirmLockRes.code = 11000;
      let expected = null;

      Lock.findOne.resolves(null);
      Lock.create.resolves();

      return test({ findOneArgs, createArgs, confirmLockArgs, confirmLockRes, expected });
    });

    it('should catch thrown error and rethrow it when lock doesn\'t exist and thrown error isn\'t DuplicateError', () => {
      let findOneArgs = { name: 'userBalance-userId' };
      let createArgs = { name: 'userBalance-userId', uid: '_mock_' };
      let confirmLockArgs = '_without-args_';
      let confirmLockRes = new Error('StrangeError');
      let expected = new Error('StrangeError');

      Lock.findOne.resolves(null);
      Lock.create.resolves();

      return test({ findOneArgs, createArgs, confirmLockArgs, confirmLockRes, expected });
    });

    it('should create and confirm lock when it doesn\'t exist', () => {
      let findOneArgs = { name: 'userBalance-userId' };
      let createArgs = { name: 'userBalance-userId', uid: '_mock_' };
      let confirmLockArgs = '_without-args_';
      let confirmLockRes = { lock: 'lockData' };
      let expected = { lock: 'lockData' };

      Lock.findOne.resolves(null);
      Lock.create.resolves();

      return test({ findOneArgs, createArgs, confirmLockArgs, confirmLockRes, expected });
    });
  });

  describe('_confirmLock', () => {
    async function test({ findOneArgs, expected }) {
      let instance = createInstace();

      let actual = await instance._confirmLock();
      nassert.assert(actual, expected);

      nassert.validateCalledFn({ srvc: Lock, fnName: 'findOne', expectedArgs: findOneArgs });
    }

    beforeEach(() => {
      sinon.stub(Lock, 'findOne');
    });

    afterEach(() => {
      Lock.findOne.restore();
    });

    it('should call related methods and return result', () => {
      let findOneArgs = { name: 'userBalance-userId', uid: '_mock_' };
      let expected = { lock: 'lockData' };

      Lock.findOne.resolves({ lock: 'lockData' });

      return test({ findOneArgs, expected });
    });
  });

  describe('_releaseLock', () => {
    function getLockInstanceStub() {
      return {
        remove: () => ({ lock: 'lockData' })
      };
    }

    async function test({ findOneArgs, expected }) {
      let instance = createInstace();

      let actual = await instance._releaseLock();
      nassert.assert(actual, expected);

      nassert.validateCalledFn({ srvc: Lock, fnName: 'findOne', expectedArgs: findOneArgs });
    }

    beforeEach(() => {
      sinon.stub(Lock, 'findOne');
    });

    afterEach(() => {
      Lock.findOne.restore();
    });

    it('should return undefined when lock not found', () => {
      let findOneArgs = { name: 'userBalance-userId', uid: '_mock_' };
      let expected = undefined;

      Lock.findOne.resolves(null);

      return test({ findOneArgs, expected });
    });

    it('should return lock object and call lock.remove when lock found', () => {
      let findOneArgs = { name: 'userBalance-userId', uid: '_mock_' };
      let expected = { lock: 'lockData' };

      Lock.findOne.resolves(getLockInstanceStub());

      return test({ findOneArgs, expected });
    });
  });

  describe('_wait', () => {
    async function test() {
      let instance = createInstace();
      await instance._wait();
    }

    it('should wait random number of ms and return', () => {
      return test();
    });
  });

  describe('functional tests', () => {
    before(() => {
      const MONGODB_URL = 'mongodb://localhost/mongo-distributed-locks-test';
      return mongoose.connect(MONGODB_URL);
    });

    // TODO:
    //beforeEach(() => User.create(initialUsers));

    afterEach(() => Promise.all([
      User.remove(),
      Lock.remove()
    ]));

    after(() => mongoose.connection.close());

    let initialUsers = [
      {
        _id: nassert.getObjectId(),
        name: 'user1',
        balance: 10
      },
      {
        _id: nassert.getObjectId(),
        name: 'user2',
        balance: 20
      },
      {
        _id: nassert.getObjectId(),
        name: 'user3',
        balance: 30
      }
    ];

    async function test({ ops, expected }) {
      await User.create(initialUsers);

      let dlocksOps = _.map(ops, op => DLocks.exec({ prefix: op.prefix, objectId: op.userId, fn: op.fn }));
      await Promise.all(dlocksOps);

      let userIds = _.map(expected, 'userId');
      let users = await User.find({ _id: { $in: userIds }});
      _.each(expected, ex => {
        let user = _.find(users, { _id: ex.userId });
        nassert.assert(user.balance, ex.balance, true);
      });

      let lockCount = await Lock.count();
      nassert.assert(lockCount, 0, true);
    }

    async function testFn({ userId, amount }) {
      let user = await User.findOne({ _id: userId });
      user.balance += amount;
      return user.save();
    }

    function getOps({ userId, amount }) {
      let fn = testFn.bind(null, { userId, amount });
      return { prefix: 'userBalance', userId, fn };
    }

    it('should lock user and calculate balance (one operation on one user)', () => {
      let ops = [
        getOps({ userId: initialUsers[0]._id, amount: 15 })
      ];
      let expected = [
        { userId: initialUsers[0]._id, balance: 25 }
      ];

      return test({ ops, expected });
    });

    it('should lock user and calculate balance (two parallel operations on one user)', () => {
      let ops = [
        getOps({ userId: initialUsers[0]._id, amount: 15 }),
        getOps({ userId: initialUsers[0]._id, amount: 25 })
      ];
      let expected = [
        { userId: initialUsers[0]._id, balance: 50 }
      ];

      return test({ ops, expected });
    });

    it('should lock user and calculate balance (three parallel operations on two users)', () => {
      let ops = [
        getOps({ userId: initialUsers[0]._id, amount: 15 }),
        getOps({ userId: initialUsers[0]._id, amount: 25 }),
        getOps({ userId: initialUsers[1]._id, amount: 35 })
      ];
      let expected = [
        { userId: initialUsers[0]._id, balance: 50 },
        { userId: initialUsers[1]._id, balance: 55 }
      ];

      return test({ ops, expected });
    });

    it('should lock user and calculate balance (three parallel operations on three users)', () => {
      let ops = [
        getOps({ userId: initialUsers[0]._id, amount: 15 }),
        getOps({ userId: initialUsers[1]._id, amount: 25 }),
        getOps({ userId: initialUsers[2]._id, amount: 35 })
      ];
      let expected = [
        { userId: initialUsers[0]._id, balance: 25 },
        { userId: initialUsers[1]._id, balance: 45 },
        { userId: initialUsers[2]._id, balance: 65 },
      ];

      return test({ ops, expected });
    });
  });
});