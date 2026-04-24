export const chatServiceQueryKeys = {
  session: ["chat-service", "session"] as const,
  feed: ["chat-service", "feed"] as const,
  replies(postId: string) {
    return ["chat-service", "feed", postId, "replies"] as const;
  },
  ask: ["chat-service", "ask"] as const,
  friends: ["chat-service", "friends"] as const,
  rooms: ["chat-service", "rooms"] as const,
  room(roomId: string) {
    return ["chat-service", "rooms", roomId] as const;
  },
  publicProfile(profileId: string) {
    return ["chat-service", "profiles", profileId] as const;
  },
  profile: ["chat-service", "profile"] as const,
} as const;
