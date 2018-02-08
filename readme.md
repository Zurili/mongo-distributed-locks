# mongo-distributed-locks
Node.js distributed locking based on Mongodb.

[![Build Status](https://travis-ci.org/Zurili/mongo-distributed-locks.svg?branch=master)](https://travis-ci.org/Zurili/mongo-distributed-locks)
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
    prefix: 'createPayment',
    objectId: params.userId,
    fn: takeFee.bind(null, params)
  });
}

function doWork() {
  let userId = 'some id';
  return Promise.all([
    takeFeeWithLock({ userId, fee: 10 }),
    takeFeeWithLock({ userId, fee: 25 })
  ]);
}
```

### API
- **static registerLoggerErrorFn(loggerErrorFn)**<br>
Registers logger error function (`DLocks` can log a few error messages), if not provided `console.error` is used`.

  - `loggerErrorFn` - logger error function. Example of usage: `DLocks.registerLoggerErrorFn(logger.error.bind(logger));`

- **static exec({ prefix, objectId, fn })**<br>
Creates a `DLocks` instance and executes its `exec` method. Shortcut for `let instance = new DLocks(params); instance.exec();`.

  - `prefix` - the name of operation, _createPayment_, _deleteUser_, etc.
  - `objectId` - the id of locking object.
  - `fn` - the function that changes the locking object.

- **exec()**<br>
Locks the resource and executes the provided function. Returns a promise.


### Author
Alexander Mac

### License
Licensed under the MIT license.
