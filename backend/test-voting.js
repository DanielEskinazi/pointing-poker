const { io } = require('socket.io-client');

// Test configuration
const SERVER_URL = 'http://localhost:3001';
const TEST_SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_PLAYER_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEST_STORY_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_PLAYER_NAME = 'Test Player';

class VotingTester {
  constructor() {
    this.socket = null;
    this.testResults = [];
    this.eventReceived = {};
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log('  Data:', JSON.stringify(data, null, 2));
    }
  }

  addResult(test, success, message) {
    this.testResults.push({ test, success, message });
    console.log(`${success ? '✅' : '❌'} ${test}: ${success ? 'PASS' : 'FAIL'} - ${message}`);
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.log('Connecting to WebSocket...');
      
      this.socket = io(SERVER_URL, {
        auth: {
          sessionId: TEST_SESSION_ID,
          playerId: TEST_PLAYER_ID,
          playerName: TEST_PLAYER_NAME,
          avatar: '👨‍💻'
        },
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        this.setupEventListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        reject(error);
      });
    });
  }

  setupEventListeners() {
    // Track all received events
    this.socket.onAny((eventName, data) => {
      this.eventReceived[eventName] = data;
      this.log(`📨 Event: ${eventName}`, data);
    });

    // Specific event handlers
    this.socket.on('session:joined', (data) => {
      this.addResult('Session Join', true, 'Session joined successfully');
    });

    this.socket.on('vote:submitted', (data) => {
      this.addResult('Vote Submit', true, `Vote submitted: ${data.voteCount}/${data.totalPlayers} players voted`);
    });

    this.socket.on('vote:changed', (data) => {
      this.addResult('Vote Change', true, 'Vote changed successfully');
    });

    this.socket.on('cards:revealed', (data) => {
      this.addResult('Cards Reveal', true, `Cards revealed with ${data.votes.length} votes`);
    });

    this.socket.on('game:reset', (data) => {
      this.addResult('Game Reset', true, 'Game reset successfully');
    });

    this.socket.on('story:updated', (data) => {
      this.addResult('Story Update', true, 'Story updated successfully');
    });
  }

  async joinSession() {
    return new Promise((resolve) => {
      this.log('Joining session...');
      this.socket.emit('session:join', {
        sessionId: TEST_SESSION_ID,
        playerId: TEST_PLAYER_ID,
        playerName: TEST_PLAYER_NAME,
        avatar: '👨‍💻',
        isSpectator: false
      });
      setTimeout(resolve, 1000);
    });
  }

  async testVoteSubmission() {
    return new Promise((resolve) => {
      this.log('Testing vote submission...');
      this.socket.emit('vote:submit', {
        storyId: TEST_STORY_ID,
        value: '5',
        confidence: 85
      });
      setTimeout(resolve, 1000);
    });
  }

  async testVoteChange() {
    return new Promise((resolve) => {
      this.log('Testing vote change...');
      this.socket.emit('vote:change', {
        storyId: TEST_STORY_ID,
        value: '8',
        confidence: 90
      });
      setTimeout(resolve, 1000);
    });
  }

  async testCardsReveal() {
    return new Promise((resolve) => {
      this.log('Testing cards reveal...');
      this.socket.emit('cards:reveal', {
        storyId: TEST_STORY_ID
      });
      setTimeout(resolve, 1000);
    });
  }

  async testGameReset() {
    return new Promise((resolve) => {
      this.log('Testing game reset...');
      this.socket.emit('game:reset', {
        storyId: TEST_STORY_ID
      });
      setTimeout(resolve, 1000);
    });
  }

  async testStoryUpdate() {
    return new Promise((resolve) => {
      this.log('Testing story update...');
      this.socket.emit('story:update', {
        storyId: TEST_STORY_ID,
        title: 'Updated Test Story',
        description: 'Updated description for testing',
        finalEstimate: '8'
      });
      setTimeout(resolve, 1000);
    });
  }

  printResults() {
    console.log('\n🏁 Voting Test Results:');
    console.log('=' .repeat(50));
    
    this.testResults.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status} ${result.test}: ${result.message}`);
    });

    const passCount = this.testResults.filter(r => r.success).length;
    const totalCount = this.testResults.length;
    console.log(`\n📊 Summary: ${passCount}/${totalCount} tests passed`);

    console.log('\n📋 Events Received:');
    Object.keys(this.eventReceived).forEach(event => {
      console.log(`  - ${event}`);
    });
  }

  async runVotingTests() {
    try {
      console.log('🚀 Starting Voting & Game Flow Tests\n');
      
      await this.connect();
      await this.joinSession();
      await this.testVoteSubmission();
      await this.testVoteChange();
      await this.testCardsReveal();
      await this.testGameReset();
      await this.testStoryUpdate();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Voting test failed:', error.message);
    } finally {
      if (this.socket) {
        this.socket.disconnect();
      }
      process.exit(0);
    }
  }
}

// Run the voting tests
const tester = new VotingTester();
tester.runVotingTests();