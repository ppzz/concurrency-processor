const Processor = require('./processor')
const _ = require('lodash')

const _originItems = Symbol('items')

class ConcurrencyLimiter extends Processor {
  constructor (items, handler, capacity, opt) {
    const wrappedItems = _.map(_.clone(items), item => ({item}))
    super(wrappedItems, handler, capacity, opt)
    this[_originItems] = items
  }

  async start () {
    const results = await super.start()
    let originalItems = _.clone(this[_originItems])
    return _.map(originalItems, originalItem => {
      return _.find(results, r => r.item === originalItem)
    })
  }
}

module.exports = ConcurrencyLimiter
