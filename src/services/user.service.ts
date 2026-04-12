import { format } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import AppError from "../errors/AppError";
import UserRepository from "../repositories/user.repository";
import supabaseAdmin from "../supabase/admin";
import { UserStatus } from "../types/user";

const bucket = "user-assets";

const UserService = {
  getUserById: async (userId: string) => {
    const result = UserRepository.getById(userId);

    if (!result) {
      throw new AppError(404, "User not found");
    }

    return result;
  },

  getPendingUpdateUserById: async (userId: string) => {
    const result = await UserRepository.getPendingUpdateById(userId);

    if (!result) {
      throw new AppError(404, "User not found for this pending update");
    }

    return result;
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
    const user = await UserRepository.getById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const lookupUser = {
      byPhone: phone ? await UserRepository.getByPhone(phone) : null,
      byIdNumber: idNumber
        ? await UserRepository.getByIdNumber(idNumber)
        : null,
      byPendingPhone: phone
        ? await UserRepository.getByPendingPhone(phone)
        : null,
      byPendingIdNumber: idNumber
        ? await UserRepository.getByPendingIdNumber(idNumber)
        : null,
    };

    if (
      (lookupUser.byPhone && lookupUser.byPhone.userId !== userId) ||
      lookupUser.byPendingPhone
    ) {
      throw new AppError(400, "User with this phone number already exists");
    }

    if (
      (lookupUser.byIdNumber && lookupUser.byIdNumber.userId !== userId) ||
      lookupUser.byPendingIdNumber
    ) {
      throw new AppError(400, "User with this ID number already exists");
    }

    let filePath: string | undefined;

    try {
      // Upload profile image
      let publicUrl: string | null | undefined;

      if (removeProfileImg) {
        publicUrl = null;
      }

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

  pendingUpdateUser: async (
    userId: string,
    name: string | undefined,
    phone: string | undefined,
    idNumber: string | null | undefined,
    dateOfBirth: string | null | undefined,
    file: Express.Multer.File | undefined,
    removeProfileImg: boolean = false,
  ) => {
    const user = await UserRepository.getById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const lookupPending = await UserRepository.getPendingUpdateById(userId);

    if (lookupPending) {
      throw new AppError(
        400,
        `${user.role.slice(0, 1).toUpperCase() + user.role.slice(1)} is already pending update`,
      );
    }

    const lookupUser = {
      byPhone: phone ? await UserRepository.getByPhone(phone) : null,
      byIdNumber: idNumber
        ? await UserRepository.getByIdNumber(idNumber)
        : null,
      byPendingPhone: phone
        ? await UserRepository.getByPendingPhone(phone)
        : null,
      byPendingIdNumber: idNumber
        ? await UserRepository.getByPendingIdNumber(idNumber)
        : null,
    };

    if (
      (lookupUser.byPhone && lookupUser.byPhone.userId !== userId) ||
      lookupUser.byPendingPhone
    ) {
      throw new AppError(400, "User with this phone number already exists");
    }

    if (
      (lookupUser.byIdNumber && lookupUser.byIdNumber.userId !== userId) ||
      lookupUser.byPendingIdNumber
    ) {
      throw new AppError(400, "User with this ID number already exists");
    }

    let filePath: string | undefined;

    try {
      // Upload profile image
      let publicUrl: string | null | undefined;

      if (removeProfileImg) {
        publicUrl = null;
      }

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

      await UserRepository.pendingUpdate(
        userId,
        name !== undefined ? name : user.name,
        phone !== undefined ? phone : user.phone,
        publicUrl !== undefined ? publicUrl : user.profileImgUrl,
        idNumber !== undefined ? idNumber : user.idNumber,
        dateOfBirth !== undefined ? dateOfBirth : user.dateOfBirth,
      );
    } catch (error) {
      // Rollback
      if (filePath) {
        await supabaseAdmin.storage.from(bucket).remove([filePath]);
      }

      throw error;
    }
  },

  approveUpdateUser: async (userId: string) => {
    const pendingUser = await UserRepository.getPendingUpdateById(userId);

    if (!pendingUser) {
      throw new AppError(404, "User not found for this pending update");
    }

    const user = await UserRepository.getById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const removedImage =
      user.profileImgUrl !== pendingUser.profileImgUrl
        ? user.profileImgUrl?.split(`/${bucket}/`)[1]
        : undefined;

    if (removedImage) {
      await supabaseAdmin.storage.from(bucket).remove([removedImage]);
    }

    await UserRepository.update(
      userId,
      pendingUser.name,
      pendingUser.phone,
      pendingUser.profileImgUrl,
      pendingUser.idNumber,
      pendingUser.dateOfBirth,
      undefined,
      undefined,
    );

    await UserRepository.deletePendingUpdate(userId);
  },

  cancelUpdateUser: async (userId: string) => {
    const pendingUser = await UserRepository.getPendingUpdateById(userId);

    if (!pendingUser) {
      throw new AppError(404, "User not found for this pending update");
    }

    const user = await UserRepository.getById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const removedImage =
      user.profileImgUrl !== pendingUser.profileImgUrl
        ? pendingUser.profileImgUrl?.split(`/${bucket}/`)[1]
        : undefined;

    if (removedImage) {
      await supabaseAdmin.storage.from(bucket).remove([removedImage]);
    }

    await UserRepository.deletePendingUpdate(userId);
  },
};

export default UserService;
