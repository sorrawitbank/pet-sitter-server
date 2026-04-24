import { NextFunction, Request, Response } from "express";
import { PET_SEXES, PetBody, PetIdParams } from "../types/pet";
import { dateRegex, nameRegex } from "../utils/regex";

const PetMiddleware = {
  petId: (req: Request<PetIdParams>, res: Response, next: NextFunction) => {
    const petId = req.params.petId;
    const parsedPetId = Number(petId);

    if (!Number.isInteger(parsedPetId) || parsedPetId <= 0) {
      return res.status(400).json({
        error: "Pet ID must be a positive integer",
      });
    }

    next();
  },

  createPetBody: (
    req: Request<{}, {}, { body: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.body?.body) {
      return res.status(400).json({ error: "Body is required" });
    }

    let body: PetBody;

    try {
      body = JSON.parse(req.body.body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const {
      petName,
      petTypeId,
      sex,
      breed,
      dateOfBirth,
      color,
      weight,
      about,
    } = body;

    // Check for required fields
    if (!petName) {
      return res.status(400).json({ error: "Pet name is required" });
    }

    if (!petTypeId) {
      return res.status(400).json({ error: "Pet type ID is required" });
    }

    if (!sex) {
      return res.status(400).json({ error: "Sex is required" });
    }

    if (!breed) {
      return res.status(400).json({ error: "Breed is required" });
    }

    if (!dateOfBirth) {
      return res.status(400).json({ error: "Date of birth is required" });
    }

    if (!color) {
      return res.status(400).json({ error: "Color is required" });
    }

    if (weight === undefined || weight === null) {
      return res.status(400).json({ error: "Weight is required" });
    }

    // Type validations
    if (typeof petName !== "string") {
      return res.status(400).json({ error: "Pet name must be a string" });
    }

    if (!nameRegex.test(petName)) {
      return res.status(400).json({ error: "Invalid pet name" });
    }

    if (petName.trim().length < 2) {
      return res.status(400).json({
        error: "Pet name must be at least 2 characters long",
      });
    }

    if (petName.trim().length > 50) {
      return res.status(400).json({
        error: "Pet name must be less than 50 characters long",
      });
    }

    if (typeof petTypeId !== "number") {
      return res.status(400).json({ error: "Pet type ID must be a number" });
    }

    if (!PET_SEXES.includes(sex)) {
      return res.status(400).json({ error: "Invalid sex" });
    }

    if (typeof breed !== "string") {
      return res.status(400).json({ error: "Breed must be a string" });
    }

    if (breed.trim().length < 2) {
      return res.status(400).json({
        error: "Breed must be at least 2 characters long",
      });
    }

    if (breed.trim().length > 100) {
      return res.status(400).json({
        error: "Breed must be less than 100 characters long",
      });
    }

    if (!dateRegex.test(dateOfBirth)) {
      return res.status(400).json({ error: "Invalid date of birth" });
    }

    const date = new Date(dateOfBirth);
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ error: "Invalid date of birth" });
    }

    if (date > new Date()) {
      return res.status(400).json({
        error: "Date of birth must be in the past",
      });
    }

    if (typeof color !== "string") {
      return res.status(400).json({ error: "Color must be a string" });
    }

    if (color.trim().length < 2) {
      return res.status(400).json({
        error: "Color must be at least 2 characters long",
      });
    }

    if (color.trim().length > 100) {
      return res.status(400).json({
        error: "Color must be less than 100 characters long",
      });
    }

    if (typeof weight !== "number") {
      return res.status(400).json({ error: "Weight must be a number" });
    }

    if (weight < 0) {
      return res.status(400).json({ error: "Weight must be greater than 0" });
    }

    if (weight >= 1000) {
      return res.status(400).json({ error: "Weight must be less than 1000" });
    }

    if (String(weight).split(".")[1]?.length > 2) {
      return res.status(400).json({
        error: "Weight must be a multiple of 0.01",
      });
    }

    if (about !== undefined && about !== null) {
      if (typeof about !== "string") {
        return res.status(400).json({ error: "About must be a string" });
      }

      if (!about.length) {
        return next();
      }

      if (about.trim().length < 5) {
        return res.status(400).json({
          error: "About must be at least 5 characters long",
        });
      }

      if (about.trim().length > 500) {
        return res.status(400).json({
          error: "About must be less than 500 characters long",
        });
      }
    }

    next();
  },

  updatePetBody: (
    req: Request<{}, {}, { body: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.body?.body) {
      return res.status(400).json({ error: "Body is required" });
    }

    let body: Partial<PetBody>;

    try {
      body = JSON.parse(req.body.body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    if (!Object.keys(body).length) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const {
      petName,
      petTypeId,
      sex,
      breed,
      dateOfBirth,
      color,
      weight,
      about,
    } = body;

    if (
      !(
        petName !== undefined ||
        petTypeId !== undefined ||
        sex !== undefined ||
        breed !== undefined ||
        dateOfBirth !== undefined ||
        color !== undefined ||
        weight !== undefined ||
        about !== undefined
      )
    ) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Type validations
    if (petName !== undefined) {
      if (typeof petName !== "string") {
        return res.status(400).json({ error: "Pet name must be a string" });
      }

      if (!nameRegex.test(petName)) {
        return res.status(400).json({ error: "Invalid pet name" });
      }

      if (petName.trim().length < 2) {
        return res.status(400).json({
          error: "Pet name must be at least 2 characters long",
        });
      }

      if (petName.trim().length > 50) {
        return res.status(400).json({
          error: "Pet name must be less than 50 characters long",
        });
      }
    }

    if (petTypeId !== undefined && typeof petTypeId !== "number") {
      return res.status(400).json({ error: "Pet type ID must be a number" });
    }

    if (sex !== undefined && !PET_SEXES.includes(sex)) {
      return res.status(400).json({ error: "Invalid sex" });
    }

    if (breed !== undefined) {
      if (typeof breed !== "string") {
        return res.status(400).json({ error: "Breed must be a string" });
      }

      if (breed.trim().length < 2) {
        return res.status(400).json({
          error: "Breed must be at least 2 characters long",
        });
      }

      if (breed.trim().length > 100) {
        return res.status(400).json({
          error: "Breed must be less than 100 characters long",
        });
      }
    }

    if (dateOfBirth !== undefined) {
      if (!dateRegex.test(dateOfBirth)) {
        return res.status(400).json({ error: "Invalid date of birth" });
      }

      const date = new Date(dateOfBirth);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid date of birth" });
      }

      if (date > new Date()) {
        return res.status(400).json({
          error: "Date of birth must be in the past",
        });
      }
    }

    if (color !== undefined) {
      if (typeof color !== "string") {
        return res.status(400).json({ error: "Color must be a string" });
      }

      if (color.trim().length < 2) {
        return res.status(400).json({
          error: "Color must be at least 2 characters long",
        });
      }

      if (color.trim().length > 100) {
        return res.status(400).json({
          error: "Color must be less than 100 characters long",
        });
      }
    }

    if (weight !== undefined) {
      if (typeof weight !== "number") {
        return res.status(400).json({ error: "Weight must be a number" });
      }

      if (weight < 0) {
        return res.status(400).json({ error: "Weight must be greater than 0" });
      }

      if (weight >= 1000) {
        return res.status(400).json({ error: "Weight must be less than 1000" });
      }

      if (String(weight).split(".")[1]?.length > 2) {
        return res.status(400).json({
          error: "Weight must be a multiple of 0.01",
        });
      }
    }

    if (about !== undefined && about !== null) {
      if (typeof about !== "string") {
        return res.status(400).json({ error: "About must be a string" });
      }

      if (!about.length) {
        return next();
      }

      if (about.trim().length < 5) {
        return res.status(400).json({
          error: "About must be at least 5 characters long",
        });
      }

      if (about.trim().length > 500) {
        return res.status(400).json({
          error: "About must be less than 500 characters long",
        });
      }
    }

    next();
  },
};

export default PetMiddleware;
