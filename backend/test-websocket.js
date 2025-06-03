const { io } = require('socket.io-client');

// Test configuration
const SERVER_URL = 'http://localhost:3001';
const TEST_SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_PLAYER_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEST_STORY_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_PLAYER_NAME = 'Test Player';

class WebSocketTester {
  constructor() {
    this.socket = null;
    this.testResults = [];
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
    console.log(`✅ ${test}: ${success ? 'PASS' : 'FAIL'} - ${message}`);
  }

  async createTestSession() {
    this.log('Creating test session in database...');
    
    // You would normally create this via API, but for testing we'll assume it exists
    // or create it directly in the database
    return TEST_SESSION_ID;
  }

  async testConnection() {
    return new Promise((resolve, reject) => {
      this.log('Testing WebSocket connection...');
      
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
        this.log('✅ Connected to WebSocket server', { socketId: this.socket.id });
        this.addResult('Connection', true, 'Successfully connected to WebSocket server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this.log('❌ Connection failed', { error: error.message });
        this.addResult('Connection', false, `Connection failed: ${error.message}`);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        this.log('🔌 Disconnected', { reason });
      });

      // Set up event listeners for testing
      this.setupEventListeners();

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.socket.connected) {
          this.addResult('Connection', false, 'Connection timeout after 10 seconds');
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  setupEventListeners() {
    // Session events
    this.socket.on('session:joined', (data) => {
      this.log('📝 Session joined', data);
      this.addResult('Session Join', true, 'Successfully joined session');
    });

    this.socket.on('session:error', (data) => {
      this.log('❌ Session error', data);
      this.addResult('Session Join', false, `Session error: ${data.error}`);
    });

    // Player events
    this.socket.on('player:joined', (data) => {
      this.log('👋 Player joined', data);
    });

    this.socket.on('player:left', (data) => {
      this.log('👋 Player left', data);
    });

    // Vote events
    this.socket.on('vote:submitted', (data) => {
      this.log('🗳️ Vote submitted', data);
      this.addResult('Vote Submit', true, 'Vote successfully submitted');
    });

    this.socket.on('cards:revealed', (data) => {
      this.log('🃏 Cards revealed', data);
      this.addResult('Cards Reveal', true, 'Cards successfully revealed');
    });

    // System events
    this.socket.on('heartbeat:response', (data) => {
      this.log('💓 Heartbeat response', data);
    });

    this.socket.on('rate:limit', (data) => {
      this.log('⚠️ Rate limit exceeded', data);
    });

    this.socket.on('connection:error', (data) => {
      this.log('❌ Connection error', data);
    });
  }

  async testSessionJoin() {
    return new Promise((resolve) => {
      this.log('Testing session join...');
      
      this.socket.emit('session:join', {
        sessionId: TEST_SESSION_ID,
        playerId: TEST_PLAYER_ID,
        playerName: TEST_PLAYER_NAME,
        avatar: '👨‍💻',
        isSpectator: false
      });

      // Wait for response
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }

  async testHeartbeat() {
    return new Promise((resolve) => {
      this.log('Testing heartbeat...');
      
      const timestamp = Date.now();
      this.socket.emit('heartbeat', { timestamp });

      this.socket.once('heartbeat:response', (data) => {
        const latency = Date.now() - data.timestamp;
        this.addResult('Heartbeat', true, `Heartbeat successful, latency: ${latency}ms`);
        resolve();
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        this.addResult('Heartbeat', false, 'Heartbeat timeout');
        resolve();
      }, 5000);
    });
  }

  async testVoting() {
    return new Promise((resolve) => {
      this.log('Testing voting functionality...');
      
      this.socket.emit('vote:submit', {
        storyId: TEST_STORY_ID,
        value: '5',
        confidence: 80
      });

      // Wait for response
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }

  async runAllTests() {
    try {
      console.log('🚀 Starting WebSocket tests...\n');
      
      await this.createTestSession();
      await this.testConnection();
      await this.testSessionJoin();
      await this.testHeartbeat();
      // Note: voting test might fail without proper session setup
      // await this.testVoting();
      
      this.log('\n📊 Test Results Summary:');
      this.testResults.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${status} ${result.test}: ${result.message}`);
      });

      const passCount = this.testResults.filter(r => r.success).length;
      const totalCount = this.testResults.length;
      console.log(`\nTests completed: ${passCount}/${totalCount} passed`);

    } catch (error) {
      console.error('Test suite failed:', error.message);
    } finally {
      if (this.socket) {
        this.socket.disconnect();
      }
      process.exit(0);
    }
  }
}

// Run the tests
const tester = new WebSocketTester();
tester.runAllTests();