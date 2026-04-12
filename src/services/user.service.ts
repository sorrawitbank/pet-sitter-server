import { format } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import AppError from "../errors/AppError";
import UserRepository from "../repositories/user.repository";
import supabaseAdmin from "../supabase/admin";
import { UserStatus } from "../types/user";

const bucket = "user-assets";

const UserService = {
  getUserByUserId: async (userId: string) => {
    return UserRepository.getById(userId);
  },

  updateUser: async (
    userId: string,
    name: string | undefined,
    phone: string | undefined,
    idNumber: string | null | undefined,
    dateOfBirth: string | null | undefined,
    status: UserStatus | undefined,
    file: Express.Multer.File | undefined,
    removeProfileImg: boolean = false,
  ) => {
    const lookupUser = {
      byUserId: await UserRepository.getById(userId),
      byPhone: phone ? await UserRepository.getByPhone(phone) : null,
      byIdNumber: idNumber
        ? await UserRepository.getByIdNumber(idNumber)
        : null,
    };

    if (!lookupUser.byUserId) {
      throw new AppError(404, "User not found");
    }

    if (lookupUser.byPhone && lookupUser.byPhone.userId !== userId) {
      throw new AppError(400, "User with this phone number already exists");
    }

    if (lookupUser.byIdNumber && lookupUser.byIdNumber.userId !== userId) {
      throw new AppError(400, "User with this ID number already exists");
    }

    let filePath: string | undefined;

    try {
      // Upload profile image
      let publicUrl: string | null | undefined;

      if (file) {
        const now = new UTCDate();
        const fileExt = file.mimetype.split("/")[1];
        filePath = `${userId}-${format(now, "yyyyMMddHHmmss")}.${fileExt}`;

        const { error } = await supabaseAdmin.storage
          .from(bucket)
          .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (error) {
          throw error;
        }

        const { data } = supabaseAdmin.storage
          .from(bucket)
          .getPublicUrl(filePath);

        publicUrl = data.publicUrl;
      }

      const user = await UserRepository.getById(userId);

      await UserRepository.update(
        userId,
        name,
        phone,
        publicUrl,
        idNumber,
        dateOfBirth,
        undefined,
        status,
      );

      if (user.profileImgUrl && (publicUrl || removeProfileImg)) {
        await supabaseAdmin.storage
          .from(bucket)
          .remove([user.profileImgUrl.split(`/${bucket}/`)[1]]);
      }
    } catch (error) {
      // Rollback
      if (filePath) {
        await supabaseAdmin.storage.from(bucket).remove([filePath]);
      }

      throw error;
    }
  },
};

export default UserService;
