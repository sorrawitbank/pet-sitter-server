import { relations } from "drizzle-orm/relations";
import {
  users,
  bookings,
  petSitters,
  provinces,
  districts,
  subDistricts,
  banks,
  petSitterBanks,
  conversations,
  messages,
  reviews,
  reports,
  petSitterPendingUpdates,
  petTypes,
  pets,
  transactions,
  bookingsPets,
  petSittersPetTypes,
  petSittersPetTypesPendingUpdates,
  petSitterImagePendingUpdates,
  petSitterImages,
  conversationReads,
} from "./schema";

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.petOwnerId],
    references: [users.userId],
  }),
  petSitter: one(petSitters, {
    fields: [bookings.petSitterId],
    references: [petSitters.petSitterId],
  }),
  reviews: many(reviews),
  transactions: many(transactions),
  bookingsPets: many(bookingsPets),
}));

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  conversations: many(conversations),
  messages: many(messages),
  petSitters: many(petSitters),
  reports_handledBy: many(reports, {
    relationName: "reports_handledBy_users_userId",
  }),
  reports_reportedUserId: many(reports, {
    relationName: "reports_reportedUserId_users_userId",
  }),
  reports_reporterUserId: many(reports, {
    relationName: "reports_reporterUserId_users_userId",
  }),
  pets: many(pets),
  conversationReads: many(conversationReads),
}));

export const petSittersRelations = relations(petSitters, ({ one, many }) => ({
  bookings: many(bookings),
  petSitterBanks: many(petSitterBanks),
  conversations: many(conversations),
  district: one(districts, {
    fields: [petSitters.districtId],
    references: [districts.districtId],
  }),
  province: one(provinces, {
    fields: [petSitters.provinceId],
    references: [provinces.provinceId],
  }),
  subDistrict: one(subDistricts, {
    fields: [petSitters.subDistrictId],
    references: [subDistricts.subDistrictId],
  }),
  user: one(users, {
    fields: [petSitters.userId],
    references: [users.userId],
  }),
  petSitterPendingUpdates: many(petSitterPendingUpdates),
  petSittersPetTypes: many(petSittersPetTypes),
  petSitterImages: many(petSitterImages),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  province: one(provinces, {
    fields: [districts.provinceId],
    references: [provinces.provinceId],
  }),
  subDistricts: many(subDistricts),
  petSitters: many(petSitters),
  petSitterPendingUpdates: many(petSitterPendingUpdates),
}));

export const provincesRelations = relations(provinces, ({ many }) => ({
  districts: many(districts),
  petSitters: many(petSitters),
  petSitterPendingUpdates: many(petSitterPendingUpdates),
}));

export const subDistrictsRelations = relations(
  subDistricts,
  ({ one, many }) => ({
    district: one(districts, {
      fields: [subDistricts.districtId],
      references: [districts.districtId],
    }),
    petSitters: many(petSitters),
    petSitterPendingUpdates: many(petSitterPendingUpdates),
  }),
);

export const petSitterBanksRelations = relations(petSitterBanks, ({ one }) => ({
  bank: one(banks, {
    fields: [petSitterBanks.bankId],
    references: [banks.bankId],
  }),
  petSitter: one(petSitters, {
    fields: [petSitterBanks.petSitterId],
    references: [petSitters.petSitterId],
  }),
}));

export const banksRelations = relations(banks, ({ many }) => ({
  petSitterBanks: many(petSitterBanks),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.ownerUserId],
      references: [users.userId],
    }),
    petSitter: one(petSitters, {
      fields: [conversations.petSitterId],
      references: [petSitters.petSitterId],
    }),
    messages: many(messages),
    conversationReads: many(conversationReads),
  }),
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.conversationId],
  }),
  user: one(users, {
    fields: [messages.senderUserId],
    references: [users.userId],
  }),
  conversationReads: many(conversationReads),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.bookingId],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  user_handledBy: one(users, {
    fields: [reports.handledBy],
    references: [users.userId],
    relationName: "reports_handledBy_users_userId",
  }),
  user_reportedUserId: one(users, {
    fields: [reports.reportedUserId],
    references: [users.userId],
    relationName: "reports_reportedUserId_users_userId",
  }),
  user_reporterUserId: one(users, {
    fields: [reports.reporterUserId],
    references: [users.userId],
    relationName: "reports_reporterUserId_users_userId",
  }),
}));

export const petSitterPendingUpdatesRelations = relations(
  petSitterPendingUpdates,
  ({ one, many }) => ({
    district: one(districts, {
      fields: [petSitterPendingUpdates.districtId],
      references: [districts.districtId],
    }),
    petSitter: one(petSitters, {
      fields: [petSitterPendingUpdates.petSitterId],
      references: [petSitters.petSitterId],
    }),
    province: one(provinces, {
      fields: [petSitterPendingUpdates.provinceId],
      references: [provinces.provinceId],
    }),
    subDistrict: one(subDistricts, {
      fields: [petSitterPendingUpdates.subDistrictId],
      references: [subDistricts.subDistrictId],
    }),
    petSittersPetTypesPendingUpdates: many(petSittersPetTypesPendingUpdates),
    petSitterImagePendingUpdates: many(petSitterImagePendingUpdates),
  }),
);

export const petsRelations = relations(pets, ({ one, many }) => ({
  petType: one(petTypes, {
    fields: [pets.petTypeId],
    references: [petTypes.petTypeId],
  }),
  user: one(users, {
    fields: [pets.userId],
    references: [users.userId],
  }),
  bookingsPets: many(bookingsPets),
}));

export const petTypesRelations = relations(petTypes, ({ many }) => ({
  pets: many(pets),
  bookingsPets: many(bookingsPets),
  petSittersPetTypes: many(petSittersPetTypes),
  petSittersPetTypesPendingUpdates: many(petSittersPetTypesPendingUpdates),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  booking: one(bookings, {
    fields: [transactions.bookingId],
    references: [bookings.bookingId],
  }),
}));

export const bookingsPetsRelations = relations(bookingsPets, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingsPets.bookingId],
    references: [bookings.bookingId],
  }),
  pet: one(pets, {
    fields: [bookingsPets.petId],
    references: [pets.petId],
  }),
  petType: one(petTypes, {
    fields: [bookingsPets.petTypeId],
    references: [petTypes.petTypeId],
  }),
}));

export const petSittersPetTypesRelations = relations(
  petSittersPetTypes,
  ({ one }) => ({
    petSitter: one(petSitters, {
      fields: [petSittersPetTypes.petSitterId],
      references: [petSitters.petSitterId],
    }),
    petType: one(petTypes, {
      fields: [petSittersPetTypes.petTypeId],
      references: [petTypes.petTypeId],
    }),
  }),
);

export const petSittersPetTypesPendingUpdatesRelations = relations(
  petSittersPetTypesPendingUpdates,
  ({ one }) => ({
    petSitterPendingUpdate: one(petSitterPendingUpdates, {
      fields: [petSittersPetTypesPendingUpdates.petSitterId],
      references: [petSitterPendingUpdates.petSitterId],
    }),
    petType: one(petTypes, {
      fields: [petSittersPetTypesPendingUpdates.petTypeId],
      references: [petTypes.petTypeId],
    }),
  }),
);

export const petSitterImagePendingUpdatesRelations = relations(
  petSitterImagePendingUpdates,
  ({ one }) => ({
    petSitterPendingUpdate: one(petSitterPendingUpdates, {
      fields: [petSitterImagePendingUpdates.petSitterId],
      references: [petSitterPendingUpdates.petSitterId],
    }),
  }),
);

export const petSitterImagesRelations = relations(
  petSitterImages,
  ({ one }) => ({
    petSitter: one(petSitters, {
      fields: [petSitterImages.petSitterId],
      references: [petSitters.petSitterId],
    }),
  }),
);

export const conversationReadsRelations = relations(
  conversationReads,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationReads.conversationId],
      references: [conversations.conversationId],
    }),
    message: one(messages, {
      fields: [conversationReads.lastReadMessageId],
      references: [messages.messageId],
    }),
    user: one(users, {
      fields: [conversationReads.userId],
      references: [users.userId],
    }),
  }),
);
