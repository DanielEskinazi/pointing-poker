import { Request, Response, NextFunction } from 'express';
import { authenticate, authorizeHost, authorizeVoter, authorizePlayer } from '../../src/middleware/auth';
import { TestDataFactory } from '../utils/test-helpers';
import { generateToken } from '../../src/utils/auth';

// Mock Express objects
const mockRequest = (overrides = {}) => ({
  headers: {},
  params: {},
  user: undefined,
  ...overrides
}) as Request;

const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res as Response;
};

const mockNext = jest.fn() as NextFunction;

describe('Authentication Middleware', () => {
  let sessionId: string;
  let hostId: string;
  let playerId: string;
  let spectatorId: string;

  beforeEach(async () => {
    // Create test data
    const session = await TestDataFactory.createTestSession();
    const host = await TestDataFactory.createTestPlayer(session.id, { id: session.hostId });
    const player = await TestDataFactory.createTestPlayer(session.id, { name: 'Regular Player' });
    const spectator = await TestDataFactory.createTestPlayer(session.id, { 
      name: 'Spectator', 
      isSpectator: true 
    });

    sessionId = session.id;
    hostId = host.id;
    playerId = player.id;
    spectatorId = spectator.id;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate with valid token', async () => {
      const token = generateToken({ sessionId, playerId: hostId, isHost: true });
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user?.playerId).toBe(hostId);
      expect(req.user?.sessionId).toBe(sessionId);
      expect(req.user?.isHost).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication token required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent session', async () => {
      const nonExistentSessionId = '550e8400-e29b-41d4-a716-446655440999';
      const token = generateToken({ 
        sessionId: nonExistentSessionId, 
        playerId: hostId, 
        isHost: true 
      });
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session no longer exists'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for inactive player', async () => {
      // Create inactive player
      const inactivePlayer = await TestDataFactory.createTestPlayer(sessionId, { 
        name: 'Inactive Player',
        isActive: false 
      });
      const token = generateToken({ 
        sessionId, 
        playerId: inactivePlayer.id, 
        isHost: false 
      });
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Player no longer exists in session'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorizeHost', () => {
    it('should authorize host user', async () => {
      const req = mockRequest({
        user: { sessionId, playerId: hostId, isHost: true },
        params: { id: sessionId }
      });
      const res = mockResponse();

      await authorizeHost(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject non-host user', async () => {
      const req = mockRequest({
        user: { sessionId, playerId, isHost: false }
      });
      const res = mockResponse();

      await authorizeHost(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Host authorization required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', async () => {
      const req = mockRequest(); // No user
      const res = mockResponse();

      await authorizeHost(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject user who is no longer host', async () => {
      // Create another session where this user is not host
      const anotherSession = await TestDataFactory.createTestSession();
      const req = mockRequest({
        user: { sessionId: anotherSession.id, playerId: hostId, isHost: true },
        params: { id: sessionId } // Different session
      });
      const res = mockResponse();

      await authorizeHost(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not authorized to perform this action'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorizeVoter', () => {
    it('should authorize regular player', async () => {
      const req = mockRequest({
        user: { sessionId, playerId, isHost: false }
      });
      const res = mockResponse();

      await authorizeVoter(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should authorize host player', async () => {
      const req = mockRequest({
        user: { sessionId, playerId: hostId, isHost: true }
      });
      const res = mockResponse();

      await authorizeVoter(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject spectator', async () => {
      const req = mockRequest({
        user: { sessionId, playerId: spectatorId, isHost: false }
      });
      const res = mockResponse();

      await authorizeVoter(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Spectators cannot vote'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', async () => {
      const req = mockRequest(); // No user
      const res = mockResponse();

      await authorizeVoter(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject inactive player', async () => {
      // Create inactive player
      const inactivePlayer = await TestDataFactory.createTestPlayer(sessionId, { 
        name: 'Inactive Player',
        isActive: false 
      });
      const req = mockRequest({
        user: { sessionId, playerId: inactivePlayer.id, isHost: false }
      });
      const res = mockResponse();

      await authorizeVoter(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Player not found or inactive'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorizePlayer', () => {
    it('should authorize player to modify own data', async () => {
      const req = mockRequest({
        user: { sessionId, playerId, isHost: false },
        params: { id: playerId }
      });
      const res = mockResponse();

      await authorizePlayer(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject player trying to modify another player', async () => {
      const req = mockRequest({
        user: { sessionId, playerId, isHost: false },
        params: { id: hostId } // Trying to modify host
      });
      const res = mockResponse();

      await authorizePlayer(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Can only modify your own player data'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', async () => {
      const req = mockRequest({
        params: { id: playerId }
      }); // No user
      const res = mockResponse();

      await authorizePlayer(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});