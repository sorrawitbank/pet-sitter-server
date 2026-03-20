import {
  pgTable,
  index,
  foreignKey,
  check,
  serial,
  uuid,
  integer,
  varchar,
  text,
  timestamp,
  numeric,
  pgPolicy,
  // type AnyPgColumn,
  unique,
  date,
  bigint,
  boolean,
  vector,
  jsonb,
  primaryKey,
  // pgView,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const bookingStatus = pgEnum("booking_status", [
  "Waiting for confirm",
  "Waiting for service",
  "In service",
  "Success",
  "Canceled",
]);
export const petSex = pgEnum("pet_sex", ["Male", "Female", "Unknown"]);
export const petSitterStatus = pgEnum("pet_sitter_status", [
  "Unapproved",
  "Waiting for approval",
  "Approved",
  "Rejected",
]);
export const reportStatus = pgEnum("report_status", [
  "New Report",
  "Pending",
  "Resolved",
  "Canceled",
]);
export const userRole = pgEnum("user_role", ["owner", "sitter", "admin"]);
export const userStatus = pgEnum("user_status", ["Normal", "Banned"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card"]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "paid",
  "failed",
]);

export const bookings = pgTable(
  "bookings",
  {
    bookingId: serial("booking_id").primaryKey().notNull(),
    petOwnerId: uuid("pet_owner_id").notNull(),
    petSitterId: integer("pet_sitter_id").notNull(),
    contactName: varchar("contact_name", { length: 100 }).notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: varchar("contact_phone", { length: 10 }).notNull(),
    startTime: timestamp("start_time", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    endTime: timestamp("end_time", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    totalPrice: numeric("total_price", { precision: 7, scale: 2 }).notNull(),
    note: text(),
    status: bookingStatus().default("Waiting for confirm").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("bookings_pet_owner_id_idx").using(
      "btree",
      table.petOwnerId.asc().nullsLast().op("uuid_ops"),
    ),
    index("bookings_pet_sitter_id_idx").using(
      "btree",
      table.petSitterId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.petOwnerId],
      foreignColumns: [users.userId],
      name: "bookings_pet_owner_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.petSitterId],
      foreignColumns: [petSitters.petSitterId],
      name: "bookings_pet_sitter_id_fkey",
    }).onDelete("cascade"),
    check(
      "bookings_contact_phone_format_check",
      sql`(contact_phone)::text ~ '^0[1-9]{1}[0-9]{8}$'::text`,
    ),
    check("bookings_time_check", sql`end_time > start_time`),
    check("bookings_total_price_check", sql`total_price >= (0)::numeric`),
  ],
);

export const districts = pgTable(
  "districts",
  {
    districtId: integer("district_id").primaryKey().notNull(),
    provinceId: integer("province_id").notNull(),
    name: varchar({ length: 120 }).notNull(),
  },
  (table) => [
    index("districts_province_id_idx").using(
      "btree",
      table.provinceId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.provinceId],
      foreignColumns: [provinces.provinceId],
      name: "districts_province_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("Enable read access for all users", {
      as: "permissive",
      for: "select",
      to: ["public"],
      using: sql`true`,
    }),
  ],
);

export const provinces = pgTable(
  "provinces",
  {
    provinceId: integer("province_id").primaryKey().notNull(),
    name: varchar({ length: 120 }).notNull(),
  },
  (table) => [
    pgPolicy("Enable read access for all users", {
      as: "permissive",
      for: "select",
      to: ["public"],
      using: sql`true`,
    }),
  ],
);

export const subDistricts = pgTable(
  "sub_districts",
  {
    subDistrictId: integer("sub_district_id").primaryKey().notNull(),
    districtId: integer("district_id").notNull(),
    name: varchar({ length: 120 }).notNull(),
    postCode: integer("post_code").notNull(),
  },
  (table) => [
    index("sub_districts_district_id_idx").using(
      "btree",
      table.districtId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.districtId],
      foreignColumns: [districts.districtId],
      name: "sub_districts_district_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("Enable read access for all users", {
      as: "permissive",
      for: "select",
      to: ["public"],
      using: sql`true`,
    }),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    conversationId: uuid("conversation_id")
      .defaultRandom()
      .primaryKey()
      .notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    petSitterId: integer("pet_sitter_id").notNull(),
    lastMessageId: uuid("last_message_id"),
    lastMessageAt: timestamp("last_message_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_conversations_last_message_at").using(
      "btree",
      table.lastMessageAt.desc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_conversations_owner_user_id").using(
      "btree",
      table.ownerUserId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_conversations_pet_sitter_id").using(
      "btree",
      table.petSitterId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.ownerUserId],
      foreignColumns: [users.userId],
      name: "fk_conversations_owner_user",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.petSitterId],
      foreignColumns: [petSitters.petSitterId],
      name: "fk_conversations_pet_sitter",
    }).onDelete("cascade"),
    unique("uq_conversations_owner_sitter").on(
      table.ownerUserId,
      table.petSitterId,
    ),
  ],
);

export const users = pgTable(
  "users",
  {
    userId: uuid("user_id").primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    phone: varchar({ length: 10 }).notNull(),
    role: userRole().default("owner").notNull(),
    profileImgUrl: text("profile_img_url"),
    idNumber: varchar("id_number", { length: 13 }),
    dateOfBirth: date("date_of_birth"),
    email: text().notNull(),
    status: userStatus().default("Normal").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("users_phone_key").on(table.phone),
    unique("users_id_number_key").on(table.idNumber),
    unique("users_email_key").on(table.email),
    check(
      "users_date_of_birth_check",
      sql`(date_of_birth IS NULL) OR (date_of_birth <= CURRENT_DATE)`,
    ),
    check(
      "users_id_number_format_check",
      sql`(id_number)::text ~ '^[0-9]{13}$'::text`,
    ),
    check(
      "users_phone_format_check",
      sql`(phone)::text ~ '^0[1-9]{1}[0-9]{8}$'::text`,
    ),
  ],
);

export const messages = pgTable("messages", {
	messageId: uuid("message_id").defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	senderUserId: uuid("sender_user_id").notNull(),
	messageType: varchar("message_type", { length: 20 }).default('text').notNull(),
	textContent: text("text_content"),
	fileUrl: text("file_url"),
	filePath: text("file_path"),
	fileName: text("file_name"),
	mimeType: text("mime_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	editedAt: timestamp("edited_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_messages_conversation_created_at").using("btree", table.conversationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_messages_sender_user_id").using("btree", table.senderUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.conversationId],
			name: "fk_messages_conversation"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderUserId],
			foreignColumns: [users.userId],
			name: "fk_messages_sender_user"
		}).onDelete("cascade"),
	check("chk_messages_has_content", sql`(COALESCE(length(TRIM(BOTH FROM text_content)), 0) > 0) OR (file_url IS NOT NULL)`),
	check("messages_message_type_check", sql`(message_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'mixed'::character varying, 'system'::character varying])::text[])`),
]);

export const petTypes = pgTable(
  "pet_types",
  {
    petTypeId: serial("pet_type_id").primaryKey().notNull(),
    name: varchar({ length: 16 }).notNull(),
  },
  (table) => [
    unique("pet_types_name_key").on(table.name),
    pgPolicy("Enable read access for all users", {
      as: "permissive",
      for: "select",
      to: ["public"],
      using: sql`true`,
    }),
  ],
);

export const petSitters = pgTable(
  "pet_sitters",
  {
    petSitterId: serial("pet_sitter_id").primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    experience: numeric({ precision: 3, scale: 1 }),
    tradeName: varchar("trade_name", { length: 50 }),
    introduction: varchar({ length: 500 }),
    services: varchar({ length: 1000 }),
    description: varchar({ length: 500 }),
    address: varchar({ length: 100 }),
    latitude: numeric({ precision: 9, scale: 6 }),
    longitude: numeric({ precision: 9, scale: 6 }),
    provinceId: integer("province_id"),
    districtId: integer("district_id"),
    subDistrictId: integer("sub_district_id"),
    reviewCount: integer("review_count").default(0),
    ratingSum: integer("rating_sum").default(0),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }),
    ratingBucket: integer("rating_bucket"),
    bankId: integer("bank_id"),
    accountNumber: varchar("account_number", { length: 30 }),
    hasPendingUpdate: boolean("has_pending_update").default(false).notNull(),
    status: petSitterStatus().default("Unapproved").notNull(),
    adminNote: text("admin_note"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("pet_sitters_district_id_idx").using(
      "btree",
      table.districtId.asc().nullsLast().op("int4_ops"),
    ),
    index("pet_sitters_province_id_idx").using(
      "btree",
      table.provinceId.asc().nullsLast().op("int4_ops"),
    ),
    index("pet_sitters_sub_district_id_idx").using(
      "btree",
      table.subDistrictId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.bankId],
      foreignColumns: [banks.bankId],
      name: "pet_sitters_bank_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.districtId],
      foreignColumns: [districts.districtId],
      name: "pet_sitters_district_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.provinceId],
      foreignColumns: [provinces.provinceId],
      name: "pet_sitters_province_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.subDistrictId],
      foreignColumns: [subDistricts.subDistrictId],
      name: "pet_sitters_sub_district_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "pet_sitters_user_id_fkey",
    }).onDelete("cascade"),
    unique("pet_sitters_user_id_key").on(table.userId),
    unique("pet_sitters_trade_name_key").on(table.tradeName),
    check(
      "pet_sitters_experience_check",
      sql`(experience IS NULL) OR (experience > (0)::numeric)`,
    ),
    check(
      "pet_sitters_latitude_check",
      sql`(latitude IS NULL) OR ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric))`,
    ),
    check(
      "pet_sitters_longitude_check",
      sql`(longitude IS NULL) OR ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric))`,
    ),
    check(
      "pet_sitters_rating_avg_check",
      sql`(rating_avg IS NULL) OR ((rating_avg >= (1)::numeric) AND (rating_avg <= (5)::numeric))`,
    ),
    check(
      "pet_sitters_rating_bucket_check",
      sql`(rating_bucket IS NULL) OR ((rating_bucket >= 1) AND (rating_bucket <= 5))`,
    ),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    reviewId: serial("review_id").primaryKey().notNull(),
    bookingId: integer("booking_id").notNull(),
    rating: integer().notNull(),
    comment: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [bookings.bookingId],
      name: "reviews_booking_id_fkey",
    }).onDelete("cascade"),
    unique("reviews_booking_id_key").on(table.bookingId),
    check("reviews_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
  ],
);

export const reports = pgTable(
  "reports",
  {
    reportId: serial("report_id").primaryKey().notNull(),
    reporterUserId: uuid("reporter_user_id").notNull(),
    reportedUserId: uuid("reported_user_id").notNull(),
    issue: text().notNull(),
    description: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", {
      withTimezone: true,
      mode: "string",
    }),
    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
      mode: "string",
    }),
    adminNote: text("admin_note"),
    handledBy: uuid("handled_by"),
    status: reportStatus().default("New Report").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.handledBy],
      foreignColumns: [users.userId],
      name: "reports_handled_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.reportedUserId],
      foreignColumns: [users.userId],
      name: "reports_reported_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.reporterUserId],
      foreignColumns: [users.userId],
      name: "reports_reporter_user_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const reports = pgTable(
  "reports",
  {
    reportId: serial("report_id").primaryKey().notNull(),
    reporterUserId: uuid("reporter_user_id").notNull(),
    reportedUserId: uuid("reported_user_id").notNull(),
    issue: text().notNull(),
    description: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", {
      withTimezone: true,
      mode: "string",
    }),
    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
      mode: "string",
    }),
    adminNote: text("admin_note"),
    handledBy: uuid("handled_by"),
    status: reportStatus().default("New Report").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.handledBy],
      foreignColumns: [users.userId],
      name: "reports_handled_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.reportedUserId],
      foreignColumns: [users.userId],
      name: "reports_reported_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.reporterUserId],
      foreignColumns: [users.userId],
      name: "reports_reporter_user_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const petSitterPendingUpdates = pgTable(
  "pet_sitter_pending_updates",
  {
    petSitterId: integer("pet_sitter_id").primaryKey().notNull(),
    experience: numeric({ precision: 3, scale: 1 }),
    tradeName: varchar("trade_name", { length: 50 }),
    introduction: varchar({ length: 500 }),
    services: varchar({ length: 1000 }),
    description: varchar({ length: 500 }),
    address: varchar({ length: 100 }),
    latitude: numeric({ precision: 9, scale: 6 }),
    longitude: numeric({ precision: 9, scale: 6 }),
    provinceId: integer("province_id"),
    districtId: integer("district_id"),
    subDistrictId: integer("sub_district_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("pet_sitter_pending_updates_district_id_idx").using(
      "btree",
      table.districtId.asc().nullsLast().op("int4_ops"),
    ),
    index("pet_sitter_pending_updates_province_id_idx").using(
      "btree",
      table.provinceId.asc().nullsLast().op("int4_ops"),
    ),
    index("pet_sitter_pending_updates_sub_district_id_idx").using(
      "btree",
      table.subDistrictId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.districtId],
      foreignColumns: [districts.districtId],
      name: "pet_sitter_pending_updates_district_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.petSitterId],
      foreignColumns: [petSitters.petSitterId],
      name: "pet_sitter_pending_updates_pet_sitter_id_fkey",
    }),
    foreignKey({
      columns: [table.provinceId],
      foreignColumns: [provinces.provinceId],
      name: "pet_sitter_pending_updates_province_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.subDistrictId],
      foreignColumns: [subDistricts.subDistrictId],
      name: "pet_sitter_pending_updates_sub_district_id_fkey",
    }).onDelete("set null"),
    unique("pet_sitter_pending_updates_trade_name_key").on(table.tradeName),
    check(
      "pet_sitters_experience_check",
      sql`(experience IS NULL) OR (experience > (0)::numeric)`,
    ),
    check(
      "pet_sitters_latitude_check",
      sql`(latitude IS NULL) OR ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric))`,
    ),
    check(
      "pet_sitters_longitude_check",
      sql`(longitude IS NULL) OR ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric))`,
    ),
  ],
);

export const ragDocuments = pgTable(
  "rag_documents",
  {
    ragDocumentId: uuid("rag_document_id")
      .defaultRandom()
      .primaryKey()
      .notNull(),
    sourceTable: text("source_table"),
    sourceId: text("source_id"),
    content: text().notNull(),
    embedding: vector({ dimensions: 1536 }).notNull(),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("rag_documents_embedding_idx")
      .using(
        "ivfflat",
        table.embedding.asc().nullsLast().op("vector_cosine_ops"),
      )
      .with({ lists: "100" }),
  ],
);

export const spatialRefSys = pgTable(
  "spatial_ref_sys",
  {
    srid: integer().notNull(),
    authName: varchar("auth_name", { length: 256 }),
    authSrid: integer("auth_srid"),
    srtext: varchar({ length: 2048 }),
    proj4Text: varchar({ length: 2048 }),
  },
  (table) => [
    check("spatial_ref_sys_srid_check", sql`(srid > 0) AND (srid <= 998999)`),
  ],
);

export const banks = pgTable(
  "banks",
  {
    bankId: serial("bank_id").primaryKey().notNull(),
    name: varchar({ length: 150 }).notNull(),
  },
  (table) => [
    unique("banks_name_key").on(table.name),
    pgPolicy("Enable read access for all users", {
      as: "permissive",
      for: "select",
      to: ["public"],
      using: sql`true`,
    }),
  ],
);

export const pets = pgTable(
  "pets",
  {
    petId: serial("pet_id").primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    petTypeId: integer("pet_type_id").notNull(),
    petName: varchar("pet_name", { length: 50 }).notNull(),
    sex: petSex().default("Unknown").notNull(),
    imgUrl: text("img_url").notNull(),
    breed: varchar({ length: 100 }).notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    color: varchar({ length: 100 }).notNull(),
    weight: numeric({ precision: 5, scale: 2 }).notNull(),
    about: varchar({ length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("pets_pet_type_id_idx").using(
      "btree",
      table.petTypeId.asc().nullsLast().op("int4_ops"),
    ),
    index("pets_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.petTypeId],
      foreignColumns: [petTypes.petTypeId],
      name: "pets_pet_type_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "pets_user_id_fkey",
    }).onDelete("cascade"),
    check(
      "pets_date_of_birth_check",
      sql`(date_of_birth IS NULL) OR (date_of_birth <= CURRENT_DATE)`,
    ),
    check(
      "pets_weight_check",
      sql`(weight IS NULL) OR (weight > (0)::numeric)`,
    ),
  ],
);

export const bookingsPets = pgTable(
  "bookings_pets",
  {
    bookingPetId: serial("booking_pet_id").primaryKey().notNull(),
    bookingId: integer("booking_id").notNull(),
    petId: integer("pet_id"),
    petTypeId: integer("pet_type_id").notNull(),
    petName: varchar("pet_name", { length: 50 }).notNull(),
    sex: petSex().notNull(),
    breed: varchar({ length: 100 }).notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    color: varchar({ length: 100 }).notNull(),
    weight: numeric({ precision: 5, scale: 2 }).notNull(),
    about: varchar({ length: 500 }),
  },
  (table) => [
    index("bookings_pets_booking_id_idx").using(
      "btree",
      table.bookingId.asc().nullsLast().op("int4_ops"),
    ),
    index("bookings_pets_pet_id_idx").using(
      "btree",
      table.petId.asc().nullsLast().op("int4_ops"),
    ),
    index("bookings_pets_pet_type_id_idx").using(
      "btree",
      table.petTypeId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [bookings.bookingId],
      name: "bookings_pets_booking_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.petId],
      foreignColumns: [pets.petId],
      name: "bookings_pets_pet_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.petTypeId],
      foreignColumns: [petTypes.petTypeId],
      name: "bookings_pets_pet_type_id_fkey",
    }).onDelete("restrict"),
    check(
      "bookings_pets_date_of_birth_check",
      sql`(date_of_birth IS NULL) OR (date_of_birth <= CURRENT_DATE)`,
    ),
    check(
      "bookings_pets_weight_check",
      sql`(weight IS NULL) OR (weight > (0)::numeric)`,
    ),
  ],
);

export const petSittersPetTypes = pgTable(
  "pet_sitters_pet_types",
  {
    petSitterId: integer("pet_sitter_id").notNull(),
    petTypeId: integer("pet_type_id").notNull(),
  },
  (table) => [
    index("pet_sitters_pet_types_pet_sitter_id_idx").using(
      "btree",
      table.petSitterId.asc().nullsLast().op("int4_ops"),
    ),
    index("pet_sitters_pet_types_pet_type_id_idx").using(
      "btree",
      table.petTypeId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.petSitterId],
      foreignColumns: [petSitters.petSitterId],
      name: "pet_sitters_pet_types_pet_sitter_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.petTypeId],
      foreignColumns: [petTypes.petTypeId],
      name: "pet_sitters_pet_types_pet_type_id_fkey",
    }),
    primaryKey({
      columns: [table.petSitterId, table.petTypeId],
      name: "pet_sitters_pet_types_pkey",
    }),
  ],
);

export const petSittersPetTypesPendingUpdates = pgTable(
  "pet_sitters_pet_types_pending_updates",
  {
    petSitterId: integer("pet_sitter_id").notNull(),
    petTypeId: integer("pet_type_id").notNull(),
  },
  (table) => [
    index("pet_sitters_pet_types_pending_updates_pet_sitter_id_idx").using(
      "btree",
      table.petSitterId.asc().nullsLast().op("int4_ops"),
    ),
    index("pet_sitters_pet_types_pending_updates_pet_type_id_idx").using(
      "btree",
      table.petTypeId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.petSitterId],
      foreignColumns: [petSitterPendingUpdates.petSitterId],
      name: "pet_sitters_pet_types_pending_updates_pet_sitter_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.petTypeId],
      foreignColumns: [petTypes.petTypeId],
      name: "pet_sitters_pet_types_pending_updates_pet_type_id_fkey",
    }).onDelete("restrict"),
    primaryKey({
      columns: [table.petSitterId, table.petTypeId],
      name: "pet_sitters_pet_types_pending_updates_pkey",
    }),
  ],
);

export const petSitterImagePendingUpdates = pgTable(
  "pet_sitter_image_pending_updates",
  {
    petSitterId: integer("pet_sitter_id").notNull(),
    imageOrder: integer("image_order").notNull(),
    imgUrl: text("img_url").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.petSitterId],
      foreignColumns: [petSitterPendingUpdates.petSitterId],
      name: "pet_sitter_image_pending_updates_pet_sitter_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.petSitterId, table.imageOrder],
      name: "pet_sitter_image_pending_updates_pkey",
    }),
    check(
      "pet_sitter_image_pending_updates_image_order_check",
      sql`(image_order >= 0) AND (image_order <= 9)`,
    ),
  ],
);

export const petSitterImages = pgTable(
  "pet_sitter_images",
  {
    petSitterId: integer("pet_sitter_id").notNull(),
    imageOrder: integer("image_order").default(0).notNull(),
    imgUrl: text("img_url").notNull(),
  },
  (table) => [
    index("pet_sitter_images_pet_sitter_id_idx").using(
      "btree",
      table.petSitterId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.petSitterId],
      foreignColumns: [petSitters.petSitterId],
      name: "pet_sitter_images_pet_sitter_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.petSitterId, table.imageOrder],
      name: "pet_sitter_images_pkey",
    }),
    check(
      "pet_sitter_images_image_order_check",
      sql`(image_order >= 0) AND (image_order <= 9)`,
    ),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    transactionId: serial("transaction_id").primaryKey().notNull(),
    bookingId: integer("booking_id").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    status: transactionStatusEnum("status").notNull().default("pending"),
    referenceNo: varchar("reference_no", { length: 50 }),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [bookings.bookingId],
      name: "transactions_booking_id_fkey",
    }).onDelete("cascade"),
    unique("transactions_booking_id_key").on(table.bookingId),
  ],
);

export const conversationReads = pgTable("conversation_reads", {
	conversationId: uuid("conversation_id").notNull(),
	userId: uuid("user_id").notNull(),
	lastReadMessageId: uuid("last_read_message_id"),
	lastReadAt: timestamp("last_read_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_conversation_reads_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.conversationId],
			name: "fk_conversation_reads_conversation"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.lastReadMessageId],
			foreignColumns: [messages.messageId],
			name: "fk_conversation_reads_last_message"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "fk_conversation_reads_user"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.conversationId, table.userId], name: "conversation_reads_pkey"}),
]);

