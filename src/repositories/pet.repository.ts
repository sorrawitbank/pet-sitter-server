import { asc, eq } from "drizzle-orm";
import db from "../db/db";
import { pets, petTypes } from "../db/schema";
import { PetSex } from "../types/pet";

const PetRepository = {
  getByUserId: async (userId: string) => {
    return db
      .select()
      .from(pets)
      .innerJoin(petTypes, eq(petTypes.petTypeId, pets.petTypeId))
      .where(eq(pets.userId, userId))
      .orderBy(asc(pets.petId));
  },

  getTypes: async () => {
    return db.select().from(petTypes).orderBy(asc(petTypes.petTypeId));
  },

  create: async (
    userId: string,
    petName: string,
    petTypeId: number,
    sex: PetSex,
    imgUrl: string,
    breed: string,
    dateOfBirth: string,
    color: string,
    weight: string,
    about: string | null,
  ) => {
    await db.insert(pets).values({
      userId,
      petName,
      petTypeId,
      sex,
      imgUrl,
      breed,
      dateOfBirth,
      color,
      weight,
      about,
    });
  },

  update: async (
    petId: number,
    petName: string | undefined,
    petTypeId: number | undefined,
    sex: PetSex | undefined,
    imgUrl: string | undefined,
    breed: string | undefined,
    dateOfBirth: string | undefined,
    color: string | undefined,
    weight: string | undefined,
    about: string | null | undefined,
  ) => {
    await db
      .update(pets)
      .set({
        petName,
        petTypeId,
        sex,
        imgUrl,
        breed,
        dateOfBirth,
        color,
        weight,
        about,
      })
      .where(eq(pets.petId, petId));
  },

  delete: async (petId: number) => {
    await db.delete(pets).where(eq(pets.petId, petId));
  },
};

export default PetRepository;
