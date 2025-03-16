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


// Parse allowed origins from the environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];


  app.use(cors({ origin: '*' }));



// Security middleware
app.use(helmet());

// Rate limiting: limit each IP to 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
});
app.use(limiter);


// Our dynamic CORS logic:
// app.use(cors({
//   origin: function (origin, callback) {
//     // If no origin (e.g. server-to-server or curl), allow
//     if (!origin) {
//       return callback(null, true);
//     }

//     // If it's some local dev address: e.g. http://localhost:3000 or 3001, etc.
//     // We check if it starts with "http://localhost:3"
//     if (origin.startsWith("http://localhost:3")) {
//       return callback(null, true); 
//     }

//     // Otherwise, we block or check a list:
//     // In production you might want a stricter check or use env var ALLOWED_ORIGINS
//     callback(new Error("Not allowed by CORS: " + origin));
//   },
//   credentials: false,
// }));

// app.use(cors({
//   origin: '*',
//   methods: ['GET','HEAD','PUT','PATCH','POST','DELETE'],
// }));


// Parse incoming JSON bodies
app.use(express.json());

// Routers (REST endpoints)
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const communityRouter = require('./routes/community');
const coachingRouter = require('./routes/coaching');
const accountRoutes = require('./routes/account/account.routes.js');
const transactionsRoutes = require('./routes/account/transactions.routes.js');
const settingsRouter = require('./routes/settings/settings.routes.js');
const tradeRouter = require("./routes/trade/trade.routes.js");


// Attach routers
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use("/trade", tradeRouter);
app.use('/community', communityRouter);
app.use('/coaching', coachingRouter);
app.use('/account', accountRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/settings', settingsRouter);

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

// If none of the above routes matched, return 404 JSON


// AFTER all the routes:
app.use((req, res, next) => {
  // This means no route matched
  res.status(404).json({ error: 'Not found' });
});

// Optionally, a generic error handler if needed
app.use((err, req, res, next) => {
  console.error('Internal server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});