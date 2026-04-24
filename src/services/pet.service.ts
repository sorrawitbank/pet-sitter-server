import { format } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import AppError from "../errors/AppError";
import PetRepository from "../repositories/pet.repository";
import UserRepository from "../repositories/user.repository";
import supabaseClient from "../supabase/client";
import { PetSex } from "../types/pet";

const bucket = "pet-assets";

const PetService = {
  getPetsByUserId: async (userId: string) => {
    return PetRepository.getByUserId(userId);
  },

  getPetById: async (userId: string, petId: number) => {
    const result = await PetRepository.getByUserId(userId);

    if (!result.map((pet) => pet.pets.petId).includes(petId)) {
      throw new AppError(404, "Pet not found or not owned by this owner");
    }

    return result.filter((pet) => pet.pets.petId === petId)[0];
  },

  getPetTypes: async () => {
    return PetRepository.getTypes();
  },

  createPet: async (
    userId: string,
    petName: string,
    petTypeId: number,
    sex: PetSex,
    breed: string,
    dateOfBirth: string,
    color: string,
    weight: string,
    about: string | null,
    file: Express.Multer.File,
  ) => {
    const lookupUser = await UserRepository.getById(userId);

    if (!lookupUser) {
      throw new AppError(404, "User not found");
    }

    const lookupPetTypeIds = (await PetRepository.getTypes()).map(
      (petType) => petType.petTypeId,
    );

    if (!lookupPetTypeIds.includes(petTypeId)) {
      throw new AppError(404, "Pet type not found");
    }

    let filePath: string | undefined;

    try {
      // Upload pet image
      const now = new UTCDate();
      const fileExt = file.mimetype.split("/")[1];
      filePath = `${userId}/${petName.replace(" ", "")}-${format(
        now,
        "yyyyMMddHHmmss",
      )}.${fileExt}`;

      const { error } = await supabaseClient.storage
        .from(bucket)
        .upload(filePath, file.buffer, { contentType: file.mimetype });

      if (error) {
        throw error;
      }

      const { data } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      await PetRepository.create(
        userId,
        petName,
        petTypeId,
        sex,
        publicUrl,
        breed,
        dateOfBirth,
        color,
        weight,
        about,
      );
    } catch (error) {
      // Rollback
      if (filePath) {
        await supabaseClient.storage.from(bucket).remove([filePath]);
      }

      throw error;
    }
  },

  updatePet: async (
    userId: string,
    petId: number,
    petName: string | undefined,
    petTypeId: number | undefined,
    sex: PetSex | undefined,
    breed: string | undefined,
    dateOfBirth: string | undefined,
    color: string | undefined,
    weight: string | undefined,
    about: string | null | undefined,
    file: Express.Multer.File | undefined,
  ) => {
    const lookupPetTypeIds = (await PetRepository.getTypes()).map(
      (petType) => petType.petTypeId,
    );

    if (petTypeId && !lookupPetTypeIds.includes(petTypeId)) {
      throw new AppError(404, "Pet type not found");
    }

    const lookupPets = await PetRepository.getByUserId(userId);
    const lookupPetIds = lookupPets.map((pet) => pet.pets.petId);

    if (!lookupPetIds.includes(petId)) {
      throw new AppError(404, "Pet not found or not owned by this owner");
    }

    const pet = lookupPets.filter((pet) => pet.pets.petId === petId)[0];

    let filePath: string | undefined;

    try {
      // Upload pet image
      let publicUrl: string | undefined;

      if (file) {
        const now = new UTCDate();
        const fileExt = file.mimetype.split("/")[1];
        filePath = `${userId}/${(petName ? petName : pet.pets.petName).replace(
          " ",
          "",
        )}-${format(now, "yyyyMMddHHmmss")}.${fileExt}`;

        const { error } = await supabaseClient.storage
          .from(bucket)
          .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (error) {
          throw error;
        }

        const { data } = supabaseClient.storage
          .from(bucket)
          .getPublicUrl(filePath);

        publicUrl = data.publicUrl;
      }

      await PetRepository.update(
        petId,
        petName,
        petTypeId,
        sex,
        publicUrl,
        breed,
        dateOfBirth,
        color,
        weight,
        about,
      );

      if (publicUrl) {
        await supabaseClient.storage
          .from(bucket)
          .remove([pet.pets.imgUrl.split(`/${bucket}/`)[1]]);
      }
    } catch (error) {
      // Rollback
      if (filePath) {
        await supabaseClient.storage.from(bucket).remove([filePath]);
      }

      throw error;
    }
  },

  deletePet: async (userId: string, petId: number) => {
    const lookupPets = await PetRepository.getByUserId(userId);
    const lookupPetIds = lookupPets.map((pet) => pet.pets.petId);

    if (!lookupPetIds.includes(petId)) {
      throw new AppError(404, "Pet not found or not owned by this owner");
    }

    await supabaseClient.storage
      .from(bucket)
      .remove([
        lookupPets
          .filter((pet) => pet.pets.petId === petId)[0]
          .pets.imgUrl.split(`/${bucket}/`)[1],
      ]);

    await PetRepository.delete(petId);
  },
};

export default PetService;
