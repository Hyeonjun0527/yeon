import type { CreateUserBody, UserDto } from "@yeon/api-contract/users";
import { userDtoSchema } from "@yeon/api-contract/users";
import { randomUUID } from "node:crypto";
import { DatabaseError } from "pg";

import {
  findUserRowByEmail,
  insertUserRow,
  listUserRows,
  type UserRow,
} from "@/server/repositories/users-repository";

import { ServiceError } from "./service-error";

function toUserDto(user: UserRow): UserDto {
  return userDtoSchema.parse({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
}

function normalizeCreateUserInput(input: CreateUserBody) {
  return {
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName?.trim() || null,
  };
}

export async function listUsers() {
  const users = await listUserRows();

  return users.map(toUserDto);
}

export async function createUser(input: CreateUserBody) {
  const normalizedInput = normalizeCreateUserInput(input);
  const existingUser = await findUserRowByEmail(normalizedInput.email);

  if (existingUser) {
    throw new ServiceError(409, "이미 등록된 이메일입니다.");
  }

  try {
    const createdUser = await insertUserRow({
      id: randomUUID(),
      ...normalizedInput,
    });

    return toUserDto(createdUser);
  } catch (error) {
    if (error instanceof DatabaseError && error.code === "23505") {
      throw new ServiceError(409, "이미 등록된 이메일입니다.");
    }

    throw error;
  }
}
