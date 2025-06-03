import { db } from '../src/database';

// Global test setup
beforeAll(async () => {
  // Initialize test database
  await db.initialize();
});

afterAll(async () => {
  // Clean up database connections
  await db.disconnect();
});

// Clean up after each test
afterEach(async () => {
  // Clean test data but preserve schema
  const prisma = db.getPrisma();
  
  // Delete in correct order due to foreign key constraints
  await prisma.vote.deleteMany();
  await prisma.story.deleteMany();
  await prisma.player.deleteMany();
  await prisma.session.deleteMany();
});