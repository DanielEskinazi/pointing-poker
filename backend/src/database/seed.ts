import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const avatars = [
  'avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5',
  'avatar-6', 'avatar-7', 'avatar-8', 'avatar-9', 'avatar-10'
];

const sampleStories = [
  {
    title: 'User Login System',
    description: 'Implement secure user authentication with JWT tokens',
  },
  {
    title: 'Dashboard Analytics',
    description: 'Create interactive charts showing user engagement metrics',
  },
  {
    title: 'Email Notifications',
    description: 'Send automated emails for important user actions',
  },
  {
    title: 'Mobile Responsive Design',
    description: 'Ensure all pages work seamlessly on mobile devices',
  },
  {
    title: 'API Rate Limiting',
    description: 'Implement rate limiting to prevent API abuse',
  },
];

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Clean existing data in development
    if (process.env.NODE_ENV === 'development') {
      await prisma.vote.deleteMany();
      await prisma.story.deleteMany();
      await prisma.player.deleteMany();
      await prisma.session.deleteMany();
      logger.info('Cleaned existing data');
    }

    // Create sample sessions
    const session1 = await prisma.session.create({
      data: {
        name: 'Frontend Team Sprint Planning',
        config: {
          cardSet: 'fibonacci',
          autoReveal: false,
          timerDuration: 300,
          allowSpectators: true,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const session2 = await prisma.session.create({
      data: {
        name: 'Backend API Review',
        config: {
          cardSet: 't-shirt',
          autoReveal: true,
          timerDuration: 180,
          allowSpectators: false,
        },
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
      },
    });

    // Create sample players for session 1
    const players1 = await Promise.all([
      prisma.player.create({
        data: {
          sessionId: session1.id,
          name: 'Alice Johnson',
          avatar: avatars[0],
          isSpectator: false,
        },
      }),
      prisma.player.create({
        data: {
          sessionId: session1.id,
          name: 'Bob Smith',
          avatar: avatars[1],
          isSpectator: false,
        },
      }),
      prisma.player.create({
        data: {
          sessionId: session1.id,
          name: 'Carol Davis',
          avatar: avatars[2],
          isSpectator: false,
        },
      }),
      prisma.player.create({
        data: {
          sessionId: session1.id,
          name: 'David Wilson',
          avatar: avatars[3],
          isSpectator: true,
        },
      }),
    ]);

    // Create sample players for session 2
    const players2 = await Promise.all([
      prisma.player.create({
        data: {
          sessionId: session2.id,
          name: 'Emma Brown',
          avatar: avatars[4],
          isSpectator: false,
        },
      }),
      prisma.player.create({
        data: {
          sessionId: session2.id,
          name: 'Frank Miller',
          avatar: avatars[5],
          isSpectator: false,
        },
      }),
    ]);

    // Set hosts
    await prisma.session.update({
      where: { id: session1.id },
      data: { hostId: players1[0].id },
    });

    await prisma.session.update({
      where: { id: session2.id },
      data: { hostId: players2[0].id },
    });

    // Create sample stories for session 1
    const stories1 = await Promise.all(
      sampleStories.map((story, index) =>
        prisma.story.create({
          data: {
            sessionId: session1.id,
            title: story.title,
            description: story.description,
            orderIndex: index + 1,
            isActive: index === 0, // First story is active
          },
        })
      )
    );

    // Create sample stories for session 2
    const stories2 = await Promise.all(
      sampleStories.slice(0, 3).map((story, index) =>
        prisma.story.create({
          data: {
            sessionId: session2.id,
            title: story.title,
            description: story.description,
            orderIndex: index + 1,
            isActive: index === 0,
          },
        })
      )
    );

    // Create sample votes for the first story in session 1
    const fibonacciValues = ['1', '2', '3', '5', '8'];
    await Promise.all(
      players1.slice(0, 3).map((player, index) =>
        prisma.vote.create({
          data: {
            storyId: stories1[0].id,
            playerId: player.id,
            sessionId: session1.id,
            value: fibonacciValues[index],
            confidence: Math.floor(Math.random() * 5) + 1,
          },
        })
      )
    );

    // Create sample votes for the first story in session 2
    const tShirtValues = ['S', 'M'];
    await Promise.all(
      players2.map((player, index) =>
        prisma.vote.create({
          data: {
            storyId: stories2[0].id,
            playerId: player.id,
            sessionId: session2.id,
            value: tShirtValues[index],
            confidence: Math.floor(Math.random() * 5) + 1,
          },
        })
      )
    );

    logger.info('Database seeding completed successfully');
    logger.info(`Created ${2} sessions with ${players1.length + players2.length} players`);
    logger.info(`Created ${stories1.length + stories2.length} stories with sample votes`);

    return {
      sessions: [session1, session2],
      players: [...players1, ...players2],
      stories: [...stories1, ...stories2],
    };
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedDatabase();
  } catch (error) {
    logger.error('Seed script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { seedDatabase };