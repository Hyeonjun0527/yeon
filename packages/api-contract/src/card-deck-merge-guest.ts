import { z } from "zod";

const CARD_TEXT_MAX_LENGTH = 2000;
const DECK_TITLE_MAX_LENGTH = 120;
const DECK_DESCRIPTION_MAX_LENGTH = 2000;
const MERGE_GUEST_MAX_DECKS = 50;
const MERGE_GUEST_MAX_ITEMS_PER_DECK = 500;

const mergeGuestItemSchema = z.object({
  frontText: z.string().min(1).max(CARD_TEXT_MAX_LENGTH),
  backText: z.string().min(1).max(CARD_TEXT_MAX_LENGTH),
});
export type MergeGuestItem = z.infer<typeof mergeGuestItemSchema>;

const mergeGuestDeckSchema = z.object({
  title: z.string().min(1).max(DECK_TITLE_MAX_LENGTH),
  description: z.string().max(DECK_DESCRIPTION_MAX_LENGTH).nullish(),
  items: z.array(mergeGuestItemSchema).max(MERGE_GUEST_MAX_ITEMS_PER_DECK),
});
export type MergeGuestDeck = z.infer<typeof mergeGuestDeckSchema>;

export const mergeGuestRequestSchema = z.object({
  decks: z.array(mergeGuestDeckSchema).min(1).max(MERGE_GUEST_MAX_DECKS),
});
export type MergeGuestRequest = z.infer<typeof mergeGuestRequestSchema>;

export const mergeGuestResponseSchema = z.object({
  createdDeckCount: z.number().int().nonnegative(),
  createdItemCount: z.number().int().nonnegative(),
});
export type MergeGuestResponse = z.infer<typeof mergeGuestResponseSchema>;

export const mergeGuestLimits = {
  maxDecks: MERGE_GUEST_MAX_DECKS,
  maxItemsPerDeck: MERGE_GUEST_MAX_ITEMS_PER_DECK,
  cardTextMaxLength: CARD_TEXT_MAX_LENGTH,
} as const;
