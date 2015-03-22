var expect = require('chai').expect
var simple = require('simple-mock')
var Slack = require('slack-client')

var Bot = require('../lib/bot.js')
var Slackinator = require('../lib/slackinator.js')

function getSlackMock() {
  var slack = new Slack('fake', true, true)
  simple.mock(slack, 'login', function() {return true})
  simple.mock(slack, 'on', function() { return null})
    
  return slack
}

describe('Slackinator', function() {
    
  afterEach(function() {
    simple.restore()
  })

  describe('#createBot()', function() {
    it('should be able to create a bot', function() {
      var bot = Slackinator.createBot({apiToken: 'TEST', slack: getSlackMock()})
      expect(bot).to.be.an.instanceof(Bot)
      expect(bot.apiToken).to.equal('TEST')
    })
    
    it('should be able to create a bot with message handlers', function() {
      var bot = Slackinator.createBot({
        apiToken: 'TEST',
        slack: getSlackMock(),
        messageHandlers: {
          testHandler: {
            listenTo: ['#test-channel'],
            replyOn: ['#test-channel'],
            match: new RegExp('test')
          }
        },
        testHandler: function() {}
      })
      expect(bot).to.be.an.instanceof(Bot)
      expect(bot.apiToken).to.equal('TEST')
    })
    
    it('should require an apiToken', function() {
      expect(Slackinator.createBot).to.throw(Error, /apiToken/)
    })
    
    it('should not allow a "handleMessage" option', function() {
      expect(Slackinator.createBot.bind(undefined, {apiToken: 'TEST', slack: getSlackMock(), handleMessage: 'fail'})).to.throw(Error, /not allowed/)
    })
    
    it('should not allow invalid message handlers', function() {
      var opts = {
        apiToken: 'TEST',
        slack: getSlackMock(),
        messageHandlers: {
          testHandler: {
            listenTo: ['#test-channel'],
            replyOn: ['#test-channel'],
            match: new RegExp('test')
          }
        }
      }
      expect(Slackinator.createBot.bind(undefined, opts)).to.throw(Error, /testHandler" is not defined/)
      opts.testHandler = function() {}
      opts.messageHandlers.testHandler.listenTo = undefined
      expect(Slackinator.createBot.bind(undefined, opts)).to.throw(Error, /does not have any "listenTo" channels defined/)
      opts.messageHandlers.testHandler.listenTo = ['#test-channel']
      opts.messageHandlers.testHandler.replyOn = undefined
      expect(Slackinator.createBot.bind(undefined, opts)).to.throw(Error, /does not have any "replyOn" channels defined/)
      opts.messageHandlers.testHandler.replyOn = ['#test-channel']
      opts.messageHandlers.testHandler.match = undefined
      expect(Slackinator.createBot.bind(undefined, opts)).to.throw(Error, /does not have a "match" RegExp/)
    })
  })
})

// describe('Bot', function() {
//     describe('#')
// })