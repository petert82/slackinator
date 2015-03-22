var Bot = require('./bot.js')

var Slackinator = {
  createBot: function(options) {
    options = options || (options = {})
    
    return new Bot(options)
  }
}

module.exports = Slackinator