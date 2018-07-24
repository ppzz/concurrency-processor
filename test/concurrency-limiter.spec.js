const assert = require('assert')
const ConcurrencyLimiter = require('../src/concurrency-limiter')

function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

describe('class ConcurrentLimiter.#start', () => {
  it('should use 400ms seconds for 8 task', async function () {
    const ids = ['22', '11', '88', '55', '33', '77', '66']
    let ssr = ''
    const handler = async (item) => {
      await sleep(50)

      if (item !== '22') {
        return item + ' good'
      }
      ssr = ssr.indexOf(item) === -1 ? item : ssr + item
      const fakeError = {message: 'an error occurred'}

      if (ssr.length < 6) throw fakeError
      return item + ' good'
    }
    const opt = {retryTimes: 3}
    const processor = new ConcurrencyLimiter(ids, handler, 4, opt)

    const expectation = [
      {item: '22', resolve: '22 good'},
      {item: '11', resolve: '11 good'},
      {item: '88', resolve: '88 good'},
      {item: '55', resolve: '55 good'},
      {item: '33', resolve: '33 good'},
      {item: '77', resolve: '77 good'},
      {item: '66', resolve: '66 good'}
    ]

    const results = await processor.start()
    assert.deepEqual(results, expectation)
  })
})
