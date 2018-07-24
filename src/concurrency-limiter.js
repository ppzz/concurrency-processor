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
    let results = await super.start()
    results = this.sort(results)
    const g = _.groupBy(results, 'processStats')
    const success = _.map(g.true, item => _.pick(item, ['item', 'resolve']))
    const failed = _.map(g.false, item => _.pick(item, ['item', 'reject']))
    return {success, failed}
  }

  sort (results) {
    let originalItems = _.clone(this[_originItems])
    return _.map(originalItems, originalItem => {
      return _.find(results, r => r.item === originalItem)
    })
  }
}

module.exports = ConcurrencyLimiter
