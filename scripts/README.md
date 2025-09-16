# Scripts Directory - DEPRECATED

This directory previously contained complex maintenance scripts that have been simplified.

## New Setup Process

All scripts have been moved to simple npm commands in the root package.json.

### Quick Start

From the root directory:

```bash
# Windows
setup.bat

# Mac/Linux
./setup.sh

# Or manually
npm install
npm run setup
```

### Available Commands

All commands are now in the root package.json:

- `npm run dev` - Start development servers
- `npm run build` - Build all packages
- `npm run test` - Run tests
- `npm run db:studio` - Open Prisma Studio
- `npm run clean` - Clean build artifacts
- `npm run fresh` - Clean install

See root package.json for all available commands.

## Environment Variables

Create these files manually or use the setup script:

### Backend (.env)
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/wealthlog
JWT_ACCESS_SECRET=change-this-secret
JWT_REFRESH_SECRET=change-this-secret
SECRET_KEY=change-this-secret
SESSION_SECRET=change-this-secret
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

## Old Scripts

The old scripts in this directory are no longer needed and should not be used.
