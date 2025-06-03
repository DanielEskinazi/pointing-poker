# Planning Poker Backend API

Backend API server for the Planning Poker application built with Node.js, Express, and TypeScript.

## Requirements

- Node.js 20 LTS or higher
- npm or yarn

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables in `.env` file

## Development

Run the development server with hot reload:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run lint` - Check code with ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - Check TypeScript types

## API Endpoints

### Health Check
- `GET /api/health` - Returns server health status

## Project Structure

```
src/
├── app.ts              # Express application setup
├── server.ts           # Server entry point
├── config/             # Configuration files
├── middleware/         # Express middleware
├── routes/             # API routes
├── types/              # TypeScript types
└── utils/              # Utility functions
```

## Environment Variables

See `.env.example` for required environment variables.