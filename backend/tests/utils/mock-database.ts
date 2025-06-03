import { jest } from '@jest/globals';

export const mockPrisma = {
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn()
  },
  player: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  },
  story: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  },
  vote: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  }
};

export function mockDatabase() {
  const dbMock = {
    getPrisma: jest.fn(() => mockPrisma),
    connect: jest.fn(),
    disconnect: jest.fn()
  };

  return dbMock;
}

export function resetAllMocks() {
  Object.values(mockPrisma).forEach(model => {
    Object.values(model).forEach(method => {
      if (jest.isMockFunction(method)) {
        method.mockReset();
      }
    });
  });
}