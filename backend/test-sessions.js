const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001/api';

class SessionAPITester {
  constructor() {
    this.testResults = [];
    this.hostToken = null;
    this.sessionId = null;
    this.playerId = null;
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

  async makeRequest(method, endpoint, data = null, token = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, options);
      const responseData = await response.json();
      
      return {
        status: response.status,
        data: responseData,
        ok: response.ok
      };
    } catch (error) {
      return {
        status: 0,
        data: { error: error.message },
        ok: false
      };
    }
  }

  async testCreateSession() {
    this.log('Testing session creation...');
    
    const sessionData = {
      name: 'Test Planning Session',
      hostName: 'John Doe',
      hostAvatar: '👨‍💻',
      password: 'test123',
      config: {
        cardValues: ['1', '2', '3', '5', '8', '13', '?'],
        allowSpectators: true,
        autoRevealCards: false,
        timerSeconds: 60
      }
    };

    const response = await this.makeRequest('POST', '/sessions', sessionData);
    
    if (response.ok && response.data.success) {
      this.sessionId = response.data.data.session.id;
      this.hostToken = response.data.data.hostToken;
      this.addResult('Create Session', true, `Session created with ID: ${this.sessionId}`);
      this.log('Session data:', response.data.data);
    } else {
      this.addResult('Create Session', false, `Failed: ${response.data.error || 'Unknown error'}`);
    }
  }

  async testGetSession() {
    if (!this.sessionId) {
      this.addResult('Get Session', false, 'No session ID available');
      return;
    }

    this.log('Testing get session...');
    
    const response = await this.makeRequest('GET', `/sessions/${this.sessionId}`);
    
    if (response.ok && response.data.success) {
      this.addResult('Get Session', true, 'Session retrieved successfully');
      this.log('Session details:', response.data.data);
    } else {
      this.addResult('Get Session', false, `Failed: ${response.data.error || 'Unknown error'}`);
    }
  }

  async testJoinSession() {
    if (!this.sessionId) {
      this.addResult('Join Session', false, 'No session ID available');
      return;
    }

    this.log('Testing join session...');
    
    const joinData = {
      playerName: 'Jane Smith',
      avatar: '👩‍💻',
      password: 'test123',
      asSpectator: false
    };

    const response = await this.makeRequest('POST', `/sessions/${this.sessionId}/join`, joinData);
    
    if (response.ok && response.data.success) {
      this.playerId = response.data.data.playerId;
      this.addResult('Join Session', true, `Player joined with ID: ${this.playerId}`);
      this.log('Join result:', response.data.data);
    } else {
      this.addResult('Join Session', false, `Failed: ${response.data.error || 'Unknown error'}`);
    }
  }

  async testUpdateSession() {
    if (!this.sessionId || !this.hostToken) {
      this.addResult('Update Session', false, 'No session ID or host token available');
      return;
    }

    this.log('Testing update session...');
    
    const updateData = {
      name: 'Updated Planning Session',
      config: {
        timerSeconds: 120,
        autoRevealCards: true
      }
    };

    const response = await this.makeRequest('PUT', `/sessions/${this.sessionId}`, updateData, this.hostToken);
    
    if (response.ok && response.data.success) {
      this.addResult('Update Session', true, 'Session updated successfully');
      this.log('Updated session:', response.data.data);
    } else {
      this.addResult('Update Session', false, `Failed: ${response.data.error || 'Unknown error'}`);
    }
  }

  async testValidationErrors() {
    this.log('Testing validation errors...');
    
    // Test creating session with invalid data
    const invalidData = {
      name: '', // Empty name should fail
      hostName: 'Host',
      config: {
        cardValues: ['1'], // Too few card values
        timerSeconds: -1 // Negative timer
      }
    };

    const response = await this.makeRequest('POST', '/sessions', invalidData);
    
    if (!response.ok && response.data.error === 'Validation failed') {
      this.addResult('Validation Errors', true, 'Validation properly rejected invalid data');
    } else {
      this.addResult('Validation Errors', false, 'Validation should have failed');
    }
  }

  async testAuthorizationErrors() {
    if (!this.sessionId) {
      this.addResult('Authorization Errors', false, 'No session ID available');
      return;
    }

    this.log('Testing authorization errors...');
    
    // Try to update session without token
    const response = await this.makeRequest('PUT', `/sessions/${this.sessionId}`, { name: 'Unauthorized Update' });
    
    if (response.status === 401) {
      this.addResult('Authorization Errors', true, 'Properly rejected unauthorized request');
    } else {
      this.addResult('Authorization Errors', false, 'Should have returned 401 Unauthorized');
    }
  }

  printResults() {
    this.log('\n📊 Session API Test Results:');
    console.log('=' .repeat(50));
    
    this.testResults.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status} ${result.test}: ${result.message}`);
    });

    const passCount = this.testResults.filter(r => r.success).length;
    const totalCount = this.testResults.length;
    console.log(`\n📋 Summary: ${passCount}/${totalCount} tests passed`);
  }

  async runAllTests() {
    try {
      console.log('🚀 Starting Session API Tests\n');
      
      await this.testCreateSession();
      await this.testGetSession();
      await this.testJoinSession();
      await this.testUpdateSession();
      await this.testValidationErrors();
      await this.testAuthorizationErrors();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    } finally {
      process.exit(0);
    }
  }
}

// Run the tests
const tester = new SessionAPITester();
tester.runAllTests();