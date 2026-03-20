import { and, desc, eq } from "drizzle-orm";
import db from "../db/db";
import {
  conversationReads,
  conversations,
  messages,
  petSitters,
} from "../db/schema";

const ChatRepository = {
  createConversationIfNotExists: async (ownerUserId: string, sitterId: number) => {
    const [created] = await db
      .insert(conversations)
      .values({
        ownerUserId,
        petSitterId: sitterId,
      })
      .onConflictDoNothing({
        target: [conversations.ownerUserId, conversations.petSitterId],
      })
      .returning({
        conversationId: conversations.conversationId,
        ownerUserId: conversations.ownerUserId,
        petSitterId: conversations.petSitterId,
      });

    return created;
  },

  findConversationByOwnerAndSitter: async (ownerUserId: string, sitterId: number) => {
    const rows = await db
      .select({
        conversationId: conversations.conversationId,
        ownerUserId: conversations.ownerUserId,
        petSitterId: conversations.petSitterId,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.ownerUserId, ownerUserId),
          eq(conversations.petSitterId, sitterId),
        ),
      )
      .limit(1);

    return rows[0];
  },

  findConversationByIdAndOwner: async (conversationId: string, ownerUserId: string) => {
    const rows = await db
      .select({
        conversationId: conversations.conversationId,
        ownerUserId: conversations.ownerUserId,
        petSitterId: conversations.petSitterId,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.conversationId, conversationId),
          eq(conversations.ownerUserId, ownerUserId),
        ),
      )
      .limit(1);

    return rows[0];
  },

  findConversationAccessById: async (conversationId: string) => {
    const rows = await db
      .select({
        conversationId: conversations.conversationId,
        ownerUserId: conversations.ownerUserId,
        sitterUserId: petSitters.userId,
      })
      .from(conversations)
      .leftJoin(petSitters, eq(petSitters.petSitterId, conversations.petSitterId))
      .where(eq(conversations.conversationId, conversationId))
      .limit(1);

    return rows[0];
  },

  createMessage: async (
    conversationId: string,
    senderUserId: string,
    textContent: string,
  ) => {
    const [insertedMessage] = await db
      .insert(messages)
      .values({
        conversationId,
        senderUserId,
        messageType: "text",
        textContent,
      })
      .returning();

    return insertedMessage;
  },

  updateConversationLastMessage: async (
    conversationId: string,
    lastMessageId: string,
    lastMessageAt: string,
  ) => {
    await db
      .update(conversations)
      .set({
        lastMessageId,
        lastMessageAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(conversations.conversationId, conversationId));
  },

  getMessagesByConversationId: async (conversationId: string, limit: number) => {
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isDeleted, false),
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  },

  findMessageInConversation: async (messageId: string, conversationId: string) => {
    const rows = await db
      .select({ messageId: messages.messageId })
      .from(messages)
      .where(
        and(
          eq(messages.messageId, messageId),
          eq(messages.conversationId, conversationId),
        ),
      )
      .limit(1);

    return rows[0];
  },

  upsertConversationRead: async (
    conversationId: string,
    userId: string,
    messageId: string,
    now: string,
  ) => {
    await db
      .insert(conversationReads)
      .values({
        conversationId,
        userId,
        lastReadMessageId: messageId,
        lastReadAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [conversationReads.conversationId, conversationReads.userId],
        set: {
          lastReadMessageId: messageId,
          lastReadAt: now,
          updatedAt: now,
        },
      });
  },
};

export default ChatRepository;
