var _ = require('lodash')
var Slack = require('slack-client')

var defaultOptions = {
  apiToken: null,
  enableGreeting: true,
  messageHandlers: {}
}

var REQUIRED_OPTIONS = ['apiToken'],
    RESERVED_OPTIONS = ['handleMessage']

var Bot = function(options) {
  var self = this;
  
  validateOptions(options)
  options = _.assign({}, defaultOptions, options)
  extendBot(self, options)
  validateMessageHandlers(self)
  
  if (! self.slack) {
    self.slack = createSlack(self.apiToken)
  }
  
  self.slack.login()
  
  function validateOptions(options) {
    var missingOptions = []
    
    _.forEach(REQUIRED_OPTIONS, function(opt) {
      if (!_.has(options, opt)) {
        missingOptions.push(opt)
      }
    })
    
    if (missingOptions.length) {
      throw new Error('These required options are missing: ' + missingOptions.join(', '))
    }
    
    var disallowedOptions = []
    
    _.forEach(RESERVED_OPTIONS, function(opt) {
      if (_.has(options, opt)) {
        disallowedOptions.push(opt)
      }
    })
    
    if (disallowedOptions.length) {
      throw new Error('These option names are not allowed: ' + disallowedOptions.join(', '))
    }
  }
  
  function extendBot(bot, options) {
    _.extend(bot, options)
  }
  
  function validateMessageHandlers(bot) {
    _.forEach(bot.messageHandlers, function(handler, name) {
      if (!_.isFunction(bot[name])) {
        throw new Error('Message handler "'+name+'" is not defined')
      }
      
      if (!_.isArray(handler.listenTo)) {
        throw new Error('Message handler "'+handler+'" does not have any "listenTo" channels defined')
      }
      
      if (!_.isArray(handler.replyOn)) {
        throw new Error('Message handler "'+handler+'" does not have any "replyOn" channels defined')
      }
      
      if (!_.isRegExp(handler.match)) {
        throw new Error('Message handler "'+handler+'" does not have a "match" RegExp defined')
      }
    })
  }
  
  function createSlack(apiToken) {
    var autoReconnect = true,
    autoMark = true,
    slack = new Slack(apiToken, autoReconnect, autoMark)
    return slack
  }
}

module.exports = Bot