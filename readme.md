# mongo-distributed-locks
Node.js distributed locking based on Mongodb.

[![Build Status](https://travis-ci.org/Zurili/mongo-distributed-locks.svg?branch=master)](https://travis-ci.org/Zurili/mongo-distributed-locks)
[![Code Coverage](https://codecov.io/gh/Zurili/mongo-distributed-locks/branch/master/graph/badge.svg)](https://codecov.io/gh/Zurili/mongo-distributed-locks)
[![npm version](https://badge.fury.io/js/mongo-distributed-locks.png)](https://badge.fury.io/js/mongo-distributed-locks)

### Commands
```bash
# Add to project
$ npm i mongo-distributed-locks
```

### Usage
```js
const DLocks = require('mongo-distributed-locks');

async function takeFee({ userId, fee }) {
  let user = await User.findOne({ _id: userId });
  user.balance -= fee;
  return user.save();
}

function takeFeeWithLock(params) {
  return DLocks.exec({
    resource: 'createPayment',
    id: params.userId,
    fn: takeFee.bind(null, params)
  });
}

function doWork() {
  let userId = 'userId';
  // current user balance is 60
  return Promise.all([
    takeFeeWithLock({ userId, fee: 10 }),
    takeFeeWithLock({ userId, fee: 25 })
  ]);
  // current user balance is 25
}

async function manageLockManually() {
  let userId = 'userId';
  let lock = await DLocks.lock({
    resource: 'user',
    id: userId
  });

  // current user balance is 60
  try {
    await takeFee({ userId, fee: 10 });
    await takeFee({ userId, fee: 25 });
    // current user balance is 25
  }
  finally {
    await DLocks.unlock(lock);
  }
}
```

### API
- **static registerLoggerErrorFn(loggerErrorFn)**<br>
Registers logger error function (`DLocks` can log a few error messages), if not provided `console.error` is used`.

  - `loggerErrorFn` - logger error function. Example of usage: `DLocks.registerLoggerErrorFn(logger.error.bind(logger));`

- **static exec({ resource, id, fn })**<br>
Creates a `DLocks` instance and executes its `exec` method. Shortcut for `let instance = new DLocks(params); instance.exec();`.

  - `resource` - operation: _createPayment_, or resource: _user_ name.
  - `id` - id of the locking resource.
  - `fn` - function that does some operation on the locking resource.

- **static lock({ resource, id, fn })**<br>
Locks resource and returns `lock` object. This method can be helpful when you need to manage lock manually. Accepts the same parameters as static `exec`.

- **unlock(lock)**<br>
Unlocks the previously locked resource.

  - `lock` - previously generated `lock` object.

### Author
Alexander Mac

### License
Licensed under the MIT license.
