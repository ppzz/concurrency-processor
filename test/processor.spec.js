const assert = require('assert')
const Processor = require('../src/processor')

function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

describe('class ConcurrentLimiter.#start', () => {
  it('should return [] when input [] in 100ms', async function () {
    this.timeout(4000)
    let ids = []
    let handler = async (id) => {
      await sleep(500)
      return id + ' good'
    }
    let capacity = 1
    const process = new Processor(ids, handler, capacity)

    const start = Date.now()
    const results = await process.start()
    const end = Date.now()

    assert(end - start < 100)
    assert.deepEqual(results, [])
  })

  it('should return 1 item', async function () {
    const ids = [{item: '111'}]
    const handler = async (item) => {
      await sleep(500)
      return item + ' good'
    }
    const processor = new Processor(ids, handler, 1)
    const start = Date.now()
    const expectation = [{item: '111', resolve: '111 good', processStats: true}]

    const results = await processor.start()
    const end = Date.now()

    assert(end - start >= 500)
    assert(end - start < 1000)
    assert.deepEqual(results, expectation)
  })

  it('should use 400ms seconds for 8 task', async function () {
    const ids = [
      {item: '111'},
      {item: '222'},
      {item: '222'},
      {item: '444'},
      {item: '555'},
      {item: '666'},
      {item: '777'},
      {item: '888'}
    ]
    const handler = async (item) => {
      await sleep(50)
      return item + ' good'
    }
    const processor = new Processor(ids, handler, 1)

    const start = Date.now()
    const expectation = [
      {item: '111', resolve: '111 good', processStats: true},
      {item: '222', resolve: '222 good', processStats: true},
      {item: '222', resolve: '222 good', processStats: true},
      {item: '444', resolve: '444 good', processStats: true},
      {item: '555', resolve: '555 good', processStats: true},
      {item: '666', resolve: '666 good', processStats: true},
      {item: '777', resolve: '777 good', processStats: true},
      {item: '888', resolve: '888 good', processStats: true}
    ]

    const results = await processor.start()
    const end = Date.now()

    assert(end - start >= 400)
    assert(end - start < 450)
    assert.deepEqual(results, expectation)
  })

  it('should test in a huge list', async function () {
    const items = []
    while (items.length < 400) {
      items.push({item: String(items.length)})
    }
    const expectation = []
    while (expectation.length < 400) {
      expectation.push({
        item: String(expectation.length),
        resolve: String(expectation.length) + ' good',
        processStats: true
      })
    }
    const handler = async (item) => {
      await sleep(50)
      return item + ' good'
    }

    const processor = new Processor(items, handler, 20)
    const start = Date.now()
    const results = await processor.start()
    const end = Date.now()

    assert(end - start > 400 / 20 * 50)
    assert(end - start < 1100)
    assert.deepEqual(results, expectation)
  })

  it('should resolve same time when call start twice', async function () {
    const ids = [
      {item: '111'},
      {item: '222'},
      {item: '444'},
      {item: '777'}
    ]
    const handler = async (item) => {
      await sleep(200)
      return item + ' good'
    }
    const processor = new Processor(ids, handler, 1)

    const expectation = [
      {item: '111', resolve: '111 good', processStats: true},
      {item: '222', resolve: '222 good', processStats: true},
      {item: '444', resolve: '444 good', processStats: true},
      {item: '777', resolve: '777 good', processStats: true}
    ]
    let firstCallResult
    let firstCallResolveTime
    let secondCallResult
    let secondCallResolveTime
    const start = Date.now()
    processor.start().then(result => {
      firstCallResult = result
      firstCallResolveTime = Date.now()
    })
    await sleep(400)
    processor.start().then(result => {
      secondCallResult = result
      secondCallResolveTime = Date.now()
    })
    await sleep(500)
    const end = Date.now()

    assert(Math.abs(firstCallResolveTime - secondCallResolveTime) < 5)
    assert(end - start < 950)
    assert.deepEqual(firstCallResult, expectation)
    assert.deepEqual(secondCallResult, expectation)
  })

  it('should reject second item', async function () {
    const items = [
      {item: '111'},
      {item: '222'},
      {item: '444'},
      {item: '777'}
    ]
    const handler = async (item) => {
      await sleep(50)
      const fakeError = {message: 'a error occurred'}
      if (item === '444') throw fakeError
      return item + ' good'
    }
    const processor = new Processor(items, handler, 1)
    const expectation = [
      {item: '111', resolve: '111 good', processStats: true},
      {item: '222', resolve: '222 good', processStats: true},
      {item: '444', reject: {message: 'a error occurred'}, processStats: false},
      {item: '777', resolve: '777 good', processStats: true}
    ]

    const result = await processor.start()

    assert.deepEqual(result, expectation)
  })

  it('should retry 3 times when error occurred', async function () {
    const items = [
      {item: '111'},
      {item: '222'},
      {item: '444'},
      {item: '777'}
    ]
    let ssr = ''
    const handler = async (item) => {
      await sleep(50)
      ssr = ssr.indexOf(item) === -1 ? item : ssr + item
      const fakeError = {message: 'an error occurred'}

      if (ssr.length < 9) throw fakeError
      return item + ' good'
    }
    const opt = {retryTimes: 3}
    const processor = new Processor(items, handler, 1, opt)
    const expectation = [
      {item: '111', resolve: '111 good', processStats: true},
      {item: '222', resolve: '222 good', processStats: true},
      {item: '444', resolve: '444 good', processStats: true},
      {item: '777', resolve: '777 good', processStats: true}
    ]

    const result = await processor.start()
    assert.deepEqual(result, expectation)
  })

  it('should retry 3 times and reject an error', async function () {
    const items = [
      {item: '111'},
      {item: '222'},
      {item: '444'},
      {item: '777'}
    ]
    let ssr = ''
    const handler = async (item) => {
      await sleep(50)

      if (item !== '222') {
        return item + ' good'
      }
      ssr = ssr.indexOf(item.item) === -1 ? item : ssr + item
      const fakeError = {message: 'error occurred'}
      if (ssr.length < 10) throw fakeError
      return item + ' good'
    }
    const opt = {retryTimes: 3}
    const processor = new Processor(items, handler, 1, opt)
    const expectation = [
      {item: '111', resolve: '111 good', processStats: true},
      {item: '222', reject: {message: 'error occurred'}, processStats: false},
      {item: '444', resolve: '444 good', processStats: true},
      {item: '777', resolve: '777 good', processStats: true}
    ]

    const result = await processor.start()
    assert.deepEqual(result, expectation)
  })
})
