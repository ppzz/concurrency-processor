const EventEmitter = require('events')
const _ = require('lodash')

class ProcessorEmitter extends EventEmitter {}

const PROCESS_EVENT = 'PROCESS_EVENT'

const _items = Symbol('items')
const _handler = Symbol('handler')
const _capacity = Symbol('capacity')
const _retryTimes = Symbol('retryTimes')
const _emitter = Symbol('emitter')
const _resolves = Symbol('resolves')
const _unprocessedItems = Symbol('unprocessedItems')
const _processingCount = Symbol('processingCount')
const _processingFlag = Symbol('processingFlag')
const _processedItems = Symbol('processedItems')

class Processor {
  constructor (items, handler, capacity, opt) {
    const {retryTimes = 1} = opt || {}
    this[_items] = items
    this[_handler] = handler
    this[_capacity] = capacity
    this[_retryTimes] = retryTimes

    this[_emitter] = null
    this[_resolves] = []
    this[_unprocessedItems] = null
    this[_processingCount] = 0
    this[_processingFlag] = false
    this[_processedItems] = []
  }

  start () {
    if (!this[_processingFlag]) {
      this[_processingFlag] = true
      if (this[_items].length === 0) return []
      this[_unprocessedItems] = _.reverse(_.clone(this[_items]))

      this.prepareReceiveResults()
    }
    const func = resolve => {
      this[_resolves].push(resolve)
      this.process()
    }
    return new Promise(func)
  }

  process () {
    while (!this.isConcurrencyOverflow() && this.isHavingUnprocessedItem()) {
      this.processOneItem()
    }
  }

  async processOneItem () {
    this[_processingCount]++
    const item = this[_unprocessedItems].pop()

    let tryCount = 0
    let isOk = false
    let result = null
    while (tryCount++ < this[_retryTimes] && !isOk) {
      try {
        result = await this[_handler](item.item)
        isOk = true
      } catch (e) {
        result = e
      }
    }
    item.processStats = isOk
    if (isOk) {
      item.resolve = result
    } else {
      item.reject = result
    }
    this[_emitter].emit(PROCESS_EVENT, item)
  }

  isHavingUnprocessedItem () {
    return this[_unprocessedItems].length !== 0
  }

  isConcurrencyOverflow () {
    return this[_processingCount] >= this[_capacity]
  }

  prepareReceiveResults () {
    const emitter = new ProcessorEmitter()
    const receiveResult = item => {
      this.finishOne(item)
      this.process()
      if (this.isAllItemsFinished()) this.responseCaller()
    }
    emitter.on(PROCESS_EVENT, receiveResult)
    this[_emitter] = emitter
  }

  responseCaller () {
    for (const res of this[_resolves]) {
      res(this[_processedItems])
    }
    this.clean()
  }

  clean () {
    this[_processingFlag] = false
    this[_resolves] = []
    this[_emitter] = null
    this[_processedItems] = []
  }

  isAllItemsFinished () {
    return this[_unprocessedItems].length === 0 && this[_processingCount] === 0
  }

  finishOne (item) {
    this[_processedItems].push(item)
    this[_processingCount]--
  }
}

module.exports = Processor
