const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TEST_SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_STORY_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_PLAYER_ID = '550e8400-e29b-41d4-a716-446655440002';

async function setupTestData() {
  try {
    console.log('🚀 Setting up test data...');

    // Create test session
    const testSession = await prisma.session.upsert({
      where: { id: TEST_SESSION_ID },
      update: {},
      create: {
        id: TEST_SESSION_ID,
        name: 'Test Planning Session',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        config: {
          cardSet: ['1', '2', '3', '5', '8', '13', '?'],
          allowRevote: true,
          autoReveal: false
        }
      }
    });

    console.log('✅ Test session created:', testSession.id);

    // Create test story
    const testStory = await prisma.story.upsert({
      where: { id: TEST_STORY_ID },
      update: {},
      create: {
        id: TEST_STORY_ID,
        sessionId: TEST_SESSION_ID,
        title: 'Test User Story',
        description: 'As a user, I want to test the WebSocket functionality',
        orderIndex: 1,
        isActive: true
      }
    });

    console.log('✅ Test story created:', testStory.id);

    // Create test player
    const testPlayer = await prisma.player.upsert({
      where: { id: TEST_PLAYER_ID },
      update: {},
      create: {
        id: TEST_PLAYER_ID,
        sessionId: TEST_SESSION_ID,
        name: 'Test Player',
        avatar: '👨‍💻',
        isSpectator: false,
        isActive: true
      }
    });

    console.log('✅ Test player created:', testPlayer.id);

    console.log('🎉 Test data setup complete!');
    console.log('Use these IDs for testing:');
    console.log('Session ID:', TEST_SESSION_ID);
    console.log('Story ID:', TEST_STORY_ID);
    console.log('Player ID:', TEST_PLAYER_ID);
    
  } catch (error) {
    console.error('❌ Failed to setup test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();