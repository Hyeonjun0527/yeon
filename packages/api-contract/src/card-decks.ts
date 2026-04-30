import { z } from "zod";

export const CARD_TEXT_MAX_LENGTH = 2000;
export const CARD_BULK_IMPORT_MAX_ITEMS = 100;

export const createCardDeckBodySchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).nullish(),
});
export type CreateCardDeckBody = z.infer<typeof createCardDeckBodySchema>;

export const updateCardDeckBodySchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullish(),
});
export type UpdateCardDeckBody = z.infer<typeof updateCardDeckBodySchema>;

export const createCardDeckItemBodySchema = z.object({
  frontText: z.string().min(1).max(CARD_TEXT_MAX_LENGTH),
  backText: z.string().min(1).max(CARD_TEXT_MAX_LENGTH),
});
export type CreateCardDeckItemBody = z.infer<
  typeof createCardDeckItemBodySchema
>;

export const createCardDeckItemsBodySchema = z.object({
  items: z
    .array(createCardDeckItemBodySchema)
    .min(1)
    .max(CARD_BULK_IMPORT_MAX_ITEMS),
});
export type CreateCardDeckItemsBody = z.infer<
  typeof createCardDeckItemsBodySchema
>;

export const updateCardDeckItemBodySchema = z.object({
  frontText: z.string().min(1).max(CARD_TEXT_MAX_LENGTH).optional(),
  backText: z.string().min(1).max(CARD_TEXT_MAX_LENGTH).optional(),
});
export type UpdateCardDeckItemBody = z.infer<
  typeof updateCardDeckItemBodySchema
>;

export const cardDeckDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CardDeckDto = z.infer<typeof cardDeckDtoSchema>;

export const cardDeckItemDtoSchema = z.object({
  id: z.string(),
  frontText: z.string(),
  backText: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CardDeckItemDto = z.infer<typeof cardDeckItemDtoSchema>;

export const cardDeckDetailResponseSchema = z.object({
  deck: cardDeckDtoSchema,
  items: z.array(cardDeckItemDtoSchema),
});
export type CardDeckDetailResponse = z.infer<
  typeof cardDeckDetailResponseSchema
>;

export const createCardDeckItemsResponseSchema = z.object({
  items: z.array(cardDeckItemDtoSchema),
});
export type CreateCardDeckItemsResponse = z.infer<
  typeof createCardDeckItemsResponseSchema
>;
