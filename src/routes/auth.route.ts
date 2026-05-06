import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import AuthMiddleware from "../middlewares/auth.middleware";

const AuthRoute = Router();

AuthRoute.get("/get-user", AuthController.getUser);

AuthRoute.post("/register", [AuthMiddleware.register], AuthController.register);

AuthRoute.post("/login", [AuthMiddleware.login], AuthController.login);

AuthRoute.put(
  "/reset-password",
  [AuthMiddleware.resetPassword],
  AuthController.resetPassword,
);

AuthRoute.patch(
  "/change-email",
  [AuthMiddleware.changEmail],
  AuthController.changeEmail,
);

export default AuthRoute;
