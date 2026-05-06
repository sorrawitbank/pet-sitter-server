import { UserRole } from "./user";

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody extends LoginBody {
  phone: string;
  role: UserRole;
}

export interface ResetPasswordBody {
  oldPassword: string;
  newPassword: string;
}

export interface ChangeEmailBody {
  email: string;
  password: string;
}
