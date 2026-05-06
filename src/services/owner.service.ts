import AppError from "../errors/AppError";
import OwnerRepository from "../repositories/owner.repository";
import PetRepository from "../repositories/pet.repository";
import { UserStatus } from "../types/user";

const OwnerService = {
  getOwners: async (
    seed: string,
    page: number,
    limit: number,
    keyword: string | null,
    status: UserStatus | null,
  ) => {
    const { result, totalOwners } = await OwnerRepository.get(
      seed,
      page,
      limit,
      keyword,
      status,
    );

    return {
      totalOwners,
      totalPages: Math.ceil(totalOwners / limit),
      petOwners: result.map((petOwner) => ({
        ...petOwner,
        petCount: petOwner.pets.length,
      })),
    };
  },

  getOwnerByUserId: async (userId: string) => {
    const result = await OwnerRepository.getByUserId(userId);

    if (!result) {
      throw new AppError(404, "Owner not found");
    }

    const pets = await PetRepository.getByUserId(userId);

    return {
      ...result,
      pets: pets.map((pet) => ({
        id: pet.pets.petId,
        imgUrl: pet.pets.imgUrl,
        petName: pet.pets.petName,
        petType: pet.pet_types.name,
        sex: pet.pets.sex,
        breed: pet.pets.breed,
        dateOfBirth: pet.pets.dateOfBirth,
        color: pet.pets.color,
        weight: pet.pets.weight,
        about: pet.pets.about,
      })),
    };
  },
};

export default OwnerService;
