var _ = require('lodash')
var Slack = require('slack-client')

var defaultOptions = {
  apiToken: null,
  enableGreeting: true,
  messageHandlers: {}
}

var REPLY_DM = '_DM_',
    REPLY_SAME_CHANNEL = '_same_'

var REQUIRED_OPTIONS = ['apiToken'],
    RESERVED_OPTIONS = ['handleMessage']

var UNKNOWN_CHANNEL = 'UNKNOWN_CHANNEL',
    UNKNOWN_USER = 'UNKNOWN_USER'

var TYPE_MESSAGE = 'message'


var Bot = function(options) {
  var self = this;
  
  validateOptions(options)
  options = _.assign({}, defaultOptions, options)
  extendBot(self, options)
  validateMessageHandlers(self)
  
  self.displayName = self.displayName || 'SlackinatorBot'
  
  if (! self.slack) {
    self.slack = createSlack(self.apiToken)
  }
  
  self.slack.login()
  
  self.slack.on('open', function() {
    var channels = [];
    
    channels = _(self.slack.channels).filter(function(channel) {
        return channel.is_member;
    }).map(function(channel) {
        return '#'+channel.name;
    });
    
    groups = _(self.slack.groups).map(function(group) {
      return group.name;
    })
    
    console.log(`${self.displayName}: ${self.slack.self.name} is in channels: "${channels.join(', ')} and groups: ${groups.join(', ')}`);
  })
  
  self.slack.on('message', function(message) {
    var channel = self.slack.getChannelGroupOrDMByID(message.channel),
        user = self.slack.getUserByID(message.user),
        channelName = getChannelName(channel),
        username = getUsername(user),
        text = getMessageText(message),
        type = message.type
    
    if (type !== TYPE_MESSAGE) {
      return
    }
        
    console.log(`${self.displayName}: Received message "${text}" on ${channelName} from ${username}`)
    
    _.forEach(self.messageHandlers, function(handler, handlerName) {
      if (!_.includes(handler.listenTo, channelName)) {
        return
      }
      
      var matchResult = handler.match.exec(text);
      if (! matchResult) {
        return
      }
      
      var response = self[handlerName].apply(self, [message, text, matchResult, channel])
      console.log(`${self.displayName}: Generated response: ${response}`)
      
      _.forEach(handler.replyOn, function(replyChanName) {
        // If we're repyling on the same channel, just send it
        if (replyChanName === channelName || replyChanName === REPLY_SAME_CHANNEL) {
          channel.send(response)
          return
        }
        
        var replyChan
        if (replyChanName.charAt(0) === '#') {
          // If we're replying on a channel, get the channel
          replyChan = self.slack.getChannelByName(replyChanName)
        } else if(replyChanName === REPLY_DM) {
          replyChan = self.slack.getDMByName(username)
        } else {
          // Otherwise it must be a group
          replyChan = self.slack.getGroupByName(replyChanName)
        }
        if (replyChan) {
          replyChan.send(response)
        }
        return
      })
    })
  })
  
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
      
      if (!_.isArray(handler.replyOn) || ! handler.replyOn.length) {
        handler.replyOn = [REPLY_SAME_CHANNEL]
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
  
  function getChannelName(channelGroupOrDm) {
    var channelName = UNKNOWN_CHANNEL
    
    if (channelGroupOrDm) {
      if (channelGroupOrDm.is_channel) {
        channelName = '#'+channelGroupOrDm.name
      }
      
      if (channelGroupOrDm.is_group) {
        channelName = channelGroupOrDm.name
      }
      
      if (channelGroupOrDm.is_im) {
        channelName = REPLY_DM
      }
    }
    return channelName
  }
  
  function getUsername(user) {
    var userName = UNKNOWN_USER;
    if (user && user.name) {
        userName = user.name;
    }
    return userName
  }
  
  function getMessageText(message) {
    var messageText = message.text
    
    if (messageText) {
      return messageText
    }
    
    // Take the text of the first attachment that has a fallback
    if (message.attachments && message.attachments.length) {
        var attch = _(message.attachments).find(function(a) {
          return a.fallback.length
        })
        
        if (attch) {
          return _.result(attch, 'fallback')
        }
    }
    
    return '';
  }
}

module.exports = Bot