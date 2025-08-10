// packages/common/src/schemas/user.ts
import { z } from 'zod';

// Define the schema for a user object based on the Prisma schema.
// This represents the user data sent to the client, so sensitive fields are omitted.
export const UserSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  dateOfBirth: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  emailVerified: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
});

// Create a TypeScript type from the schema
export type User = z.infer<typeof UserSchema>;
