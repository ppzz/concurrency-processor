# Concurrency-processor

## Description

* limit concurrent scale in js
* retry function
* work with async function


## Usage

```js
const ConcurrencyLimiter = require('concurrency-limiter')

function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

const ids = ['22', '11', '88', '55', '33', '77', '66']
const handler = async (obj) => {
  await sleep(50)
  if (obj.item === '11') throw {message: 'something error!'}
  return obj.item + ' good'
}
const capacity = 4
const opt = {retryTimes: 3} // optional

const processor = new ConcurrencyLimiter(ids, handler, capacity, opt)
const {success, failed} = await processor.start()

// success:
// [
//   {item: '22', resolve: '22 good'},
//   {item: '88', resolve: '88 good'},
//   {item: '55', resolve: '55 good'},
//   {item: '33', resolve: '33 good'},
//   {item: '77', resolve: '77 good'},
//   {item: '66', resolve: '66 good'}
// ]
// failed:
// [
//   {item: '11', reject: {message: 'something error!'} }
// ]


```
