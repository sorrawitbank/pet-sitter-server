import { and, desc, eq, gt, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import db from "../db/db";
import {
  conversationReads,
  conversations,
  messages,
  petSitters,
  users,
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

  findConversationListByOwnerUserId: async (ownerUserId: string) => {
    const sitterUsers = alias(users, "sitter_users");
    const lastMessages = alias(messages, "last_messages");

    return await db
      .select({
        conversationId: conversations.conversationId,
        updatedAt: conversations.updatedAt,
        tradeName: petSitters.tradeName,
        sitterName: sitterUsers.name,
        avatarUrl: sitterUsers.profileImgUrl,
        lastMessageText: lastMessages.textContent,
        lastMessageType: lastMessages.messageType,
        lastMessageImgUrl: lastMessages.imgUrl,
        lastMessageCreatedAt: lastMessages.createdAt,
      })
      .from(conversations)
      .innerJoin(petSitters, eq(petSitters.petSitterId, conversations.petSitterId))
      .innerJoin(sitterUsers, eq(sitterUsers.userId, petSitters.userId))
      .leftJoin(lastMessages, eq(lastMessages.messageId, conversations.lastMessageId))
      .where(eq(conversations.ownerUserId, ownerUserId))
      .orderBy(desc(conversations.updatedAt));
  },

  findConversationListBySitterUserId: async (sitterUserId: string) => {
    const ownerUsers = alias(users, "owner_users");
    const lastMessages = alias(messages, "last_messages");

    return await db
      .select({
        conversationId: conversations.conversationId,
        updatedAt: conversations.updatedAt,
        ownerName: ownerUsers.name,
        avatarUrl: ownerUsers.profileImgUrl,
        lastMessageText: lastMessages.textContent,
        lastMessageType: lastMessages.messageType,
        lastMessageImgUrl: lastMessages.imgUrl,
        lastMessageCreatedAt: lastMessages.createdAt,
      })
      .from(conversations)
      .innerJoin(petSitters, eq(petSitters.petSitterId, conversations.petSitterId))
      .innerJoin(ownerUsers, eq(ownerUsers.userId, conversations.ownerUserId))
      .leftJoin(lastMessages, eq(lastMessages.messageId, conversations.lastMessageId))
      .where(eq(petSitters.userId, sitterUserId))
      .orderBy(desc(conversations.updatedAt));
  },

  createMessage: async (params: {
    conversationId: string;
    senderUserId: string;
    messageType: "text" | "image";
    textContent?: string | null;
    imgUrl?: string | null;
  }) => {
    const [insertedMessage] = await db
      .insert(messages)
      .values({
        conversationId: params.conversationId,
        senderUserId: params.senderUserId,
        messageType: params.messageType,
        textContent: params.textContent ?? null,
        imgUrl: params.imgUrl ?? null,
      })
      .returning();

    return insertedMessage;
  },

  updateConversationLastMessage: async (
    conversationId: string,
    lastMessageId: string,
  ) => {
    await db
      .update(conversations)
      .set({
        lastMessageId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(conversations.conversationId, conversationId));
  },

  getMessagesByConversationId: async (conversationId: string, limit: number) => {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
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
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [conversationReads.conversationId, conversationReads.userId],
        set: {
          lastReadMessageId: messageId,
          updatedAt: now,
        },
      });
  },

  getConversationReadByConversationAndUser: async (
    conversationId: string,
    userId: string,
  ) => {
    const rows = await db
      .select({
        lastReadMessageId: conversationReads.lastReadMessageId,
      })
      .from(conversationReads)
      .where(
        and(
          eq(conversationReads.conversationId, conversationId),
          eq(conversationReads.userId, userId),
        ),
      )
      .limit(1);

    return rows[0];
  },

  getMessageById: async (messageId: string) => {
    const rows = await db
      .select({
        messageId: messages.messageId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.messageId, messageId))
      .limit(1);

    return rows[0];
  },

  countUnreadMessagesForUser: async (
    conversationId: string,
    userId: string,
    lastReadAt?: string,
  ) => {
    const baseFilter = and(
      eq(messages.conversationId, conversationId),
      ne(messages.senderUserId, userId),
    );

    const rows = lastReadAt
      ? await db
          .select({ messageId: messages.messageId })
          .from(messages)
          .where(and(baseFilter, gt(messages.createdAt, lastReadAt)))
      : await db
          .select({ messageId: messages.messageId })
          .from(messages)
          .where(baseFilter);

    return rows.length;
  },
};

export default ChatRepository;
