// src/index.js
require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

// Security middleware
app.use(helmet());

// Rate limiting: limit each IP to 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

// Configure CORS: Only allow requests from allowedOrigin (no credentials since we use Bearer tokens)
app.use(cors({
  origin: allowedOrigin,
  credentials: false,
}));

// Parse incoming JSON bodies
app.use(express.json());

// Routers (REST endpoints)
const authRouter = require('./routes/auth');
const tradeRouter = require('./routes/trade');
const transactionsRouter = require('./routes/transactions');
const accountRouter = require('./routes/account');
const financialAccountRouter = require('./routes/financialAccount');
const settingsRouter = require('./routes/settings');
const adminRouter = require('./routes/admin');
const communityRouter = require('./routes/community');
const coachingRouter = require('./routes/coaching');

// Attach routers
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/transactions', transactionsRouter);
app.use('/trades', tradeRouter);
app.use('/account', accountRouter);
app.use('/financial-accounts', financialAccountRouter);
app.use('/settings', settingsRouter);
app.use('/community', communityRouter);
app.use('/coaching', coachingRouter);

/*
 Optional: GraphQL Integration
 If you wish to expose a GraphQL endpoint in addition to your REST API (or eventually switch to it),
 you can integrate Apollo Server Express. This approach gives you additional flexibility when building
 rich mobile clients or if you wish to aggregate multiple data sources.
 
 To enable, install 'apollo-server-express' and uncomment the code below.
 
 const { ApolloServer, gql } = require('apollo-server-express');
 
 // Define a simple schema and resolvers (customize as needed)
 const typeDefs = gql`
   type Query {
     hello: String
   }
 `;
 
 const resolvers = {
   Query: {
     hello: () => 'Hello world!',
   },
 };
 
 async function startApolloServer() {
   const server = new ApolloServer({ typeDefs, resolvers });
   await server.start();
   server.applyMiddleware({ app, path: '/graphql' });
 }
 
 startApolloServer();
*/

// Start the server
app.listen(PORT, () => {
  console.log(`WealthLog API running on port ${PORT}`);
});
