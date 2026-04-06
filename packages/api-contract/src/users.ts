import { z } from "zod";

export const userDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1).max(80).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const listUsersResponseSchema = z.object({
  users: z.array(userDtoSchema),
});

export const createUserBodySchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const createUserResponseSchema = z.object({
  user: userDtoSchema,
});

export type UserDto = z.infer<typeof userDtoSchema>;
export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>;
export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;
