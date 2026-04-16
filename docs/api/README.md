# Pet Sitter Server – API Documentation

## Overview

REST API for the Pet Sitter application supporting three roles:

- **Owner** – pet owner
- **Sitter** – pet sitter
- **Admin** – system administrator

**Base information**

- **Base URL:** `http://localhost:4000` (or the value of `PORT` in your environment)
- **Content-Type (default):** `application/json`
- **Allowed methods:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`

---

## Authentication

Endpoints that require authentication use a **Bearer token** in the `Authorization` header:

```http
Authorization: Bearer <accessToken>
```

The `accessToken` is obtained from `POST /auth/login`.

If the token is missing or invalid, the API usually responds with:

```json
{
  "error": "Unauthorized: Token missing"
}
```

or another descriptive error message with HTTP status `401`.

---

## General

### Root

| Method | Path       | Description                           |
|--------|------------|---------------------------------------|
| GET    | `/`        | Welcome message string                |
| GET    | `/health`  | Health check with status and timestamp |

### Error Response (Generic Shape)

Most error responses follow this general shape:

```json
{
  "error": "Error message string"
}
```

Common status codes:

- `400` – Validation / bad request
- `401` – Unauthorized (missing or invalid token)
- `403` – Forbidden (role not allowed)
- `404` – Resource not found
- `500` – Internal server error

Individual endpoints may add more specific rules and messages.

---

## Auth – `/auth`

### GET /auth/get-user

Get the current authenticated user from the access token.

**Headers**

- `Authorization: Bearer <accessToken>`

**Success (200)**

```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "phone": "string",
  "profileImgUrl": "string | null",
  "role": "owner" | "sitter" | "admin",
  "sitterId": "number | undefined"
}
```

If the user is a sitter and a sitter profile exists, `sitterId` is a number; otherwise it can be `undefined`.

**Errors**

- `401` – Missing or invalid token (e.g. `"Unauthorized: Token missing"`)
- `4xx` – Other client errors from auth service
- `500` – Internal server error

---

### POST /auth/register

Register a new user.

**Body (JSON)**

| Field    | Type   | Required | Constraints                                      |
|----------|--------|----------|--------------------------------------------------|
| email    | string | ✓        | Valid email format                               |
| phone    | string | ✓        | 10 digits, `0xxxxxxxxx`                          |
| password | string | ✓        | Minimum 12 characters                            |
| role     | string | ✓        | `"owner"` \| `"sitter"` (admin registration not allowed) |

**Success (201)**

```json
{
  "message": "User registered successfully"
}
```

**Errors**

- `400` – Validation errors from `AuthMiddleware.register` or service
- `409` – Possible conflict (e.g. email already exists) depending on service
- `500` – `"An error occurred during registration"`

---

### POST /auth/login

Log in an existing user.

**Body (JSON)**

| Field    | Type   | Required | Constraints           |
|----------|--------|----------|-----------------------|
| email    | string | ✓        | Valid email           |
| password | string | ✓        | Minimum 12 characters |

**Success (200)**

```json
{
  "message": "Logged in successfully",
  "accessToken": "string"
}
```

**Errors**

- `400` or `401` – Invalid credentials or validation errors (from service)
- `500` – `"An error occurred during login"`

---

### PUT /auth/reset-password

Reset the password for the authenticated user.

**Headers**

- `Authorization: Bearer <accessToken>`

**Body (JSON)**

| Field       | Type   | Required | Constraints           |
|-------------|--------|----------|-----------------------|
| oldPassword | string | ✓        | Minimum 12 characters |
| newPassword | string | ✓        | Minimum 12 characters |

**Success (200)**

```json
{
  "message": "Password reset successfully"
}
```

**Errors**

- `400` – Validation errors (from `AuthMiddleware.resetPassword` or service)
- `401` – `"Unauthorized: Token missing"`
- `4xx` – Other client errors from service (e.g. wrong old password)
- `500` – `"Internal server error"`

---

## Pet Types – `/pet`

### GET /pet/type

Get the list of available pet types.

**Auth**: Not required.

**Success (200)**

```json
[
  {
    "id": 1,
    "name": "Dog"
  },
  {
    "id": 2,
    "name": "Cat"
  }
]
```

**Errors**

- `500` – `"Internal server error"`

---

## Pet Owner – `/pet-owner`

All endpoints under `/pet-owner` require:

- `Authorization: Bearer <accessToken>` with **role = owner**

### GET /pet-owner/pet

Get the list of pets for the currently authenticated owner.

**Headers**

- `Authorization: Bearer <accessToken>`

**Success (200)**

```json
[
  {
    "id": 1,
    "imgUrl": "string",
    "petName": "string",
    "petType": "string"
  }
]
```

**Errors**

- `401` – `"Unauthorized: Token missing"`
- `403` – Forbidden (user is not an owner, enforced by middleware)
- `500` – `"Internal server error"`

---

### GET /pet-owner/pet/:petId

Get details of a single pet belonging to the authenticated owner.

**Headers**

- `Authorization: Bearer <accessToken>`

**Path Parameters**

| Param  | Type   | Required | Description                |
|--------|--------|----------|----------------------------|
| petId  | number | ✓        | Positive integer pet ID    |

**Success (200)**

```json
{
  "id": 1,
  "imgUrl": "string",
  "petName": "string",
  "petType": "string",
  "sex": "Male" | "Female" | "Unknown",
  "breed": "string",
  "dateOfBirth": "string",
  "color": "string",
  "weight": "number",
  "about": "string | null"
}
```

**Errors**

- `400` – Invalid `petId` (via `PetMiddleware.petId`)
- `401` – `"Unauthorized: Token missing"`
- `403` – Pet does not belong to this owner (service error)
- `404` – Pet not found
- `500` – `"Internal server error"`

---

### POST /pet-owner/pet

Create a new pet for the authenticated owner.

**Headers**

- `Authorization: Bearer <accessToken>`

**Content-Type**

- `multipart/form-data`
  - `image` – image file (required)
  - `body` – JSON string (required)

**Form field `body` (JSON string)**

| Field       | Type   | Required | Constraints                                           |
|-------------|--------|----------|-------------------------------------------------------|
| petName     | string | ✓        | 2–50 characters, alphanumeric + spaces                |
| petTypeId   | number | ✓        | Existing pet type ID                                  |
| sex         | string | ✓        | `"Male"` \| `"Female"` \| `"Unknown"`                 |
| breed       | string | ✓        | 2–100 characters                                      |
| dateOfBirth | string | ✓        | `YYYY-MM-DD`, must be a past date                     |
| color       | string | ✓        | 2–100 characters                                      |
| weight      | number | ✓        | `0 < weight < 1000`, up to 2 decimal places           |
| about       | string | -        | 5–500 characters                                      |

**Success (201)**

```json
{
  "message": "Pet created successfully"
}
```

**Errors**

- `400` – Missing file, invalid JSON, or validation errors (from `PetMiddleware.createPetBody`)
- `401` – `"Unauthorized: Token missing"`
- `403` – Forbidden (role is not owner)
- `500` – `"Internal server error"`

---

### PUT /pet-owner/pet/:petId

Update an existing pet belonging to the authenticated owner.

**Headers**

- `Authorization: Bearer <accessToken>`

**Path Parameters**

| Param  | Type   | Required | Description             |
|--------|--------|----------|-------------------------|
| petId  | number | ✓        | Positive integer pet ID |

**Content-Type**

- `multipart/form-data`
  - `image` – image file (optional)
  - `body` – JSON string (required)

**Form field `body` (JSON string)**

Fields are the same as `POST /pet-owner/pet`, but all are optional. Any field that is provided must satisfy the same validation constraints as in the create endpoint.

If none of the updatable fields are provided, the middleware returns:

```json
{
  "error": "No fields to update"
}
```

**Success (200)**

```json
{
  "message": "Pet updated successfully"
}
```

**Errors**

- `400` – Invalid `petId` or body validation errors (`PetMiddleware.petId`, `PetMiddleware.updatePetBody`)
- `401` – `"Unauthorized: Token missing"`
- `403` – Pet does not belong to this owner
- `404` – Pet not found
- `500` – `"Internal server error"`

---

### DELETE /pet-owner/pet/:petId

Delete a pet belonging to the authenticated owner.

**Headers**

- `Authorization: Bearer <accessToken>`

**Path Parameters**

| Param  | Type   | Required | Description             |
|--------|--------|----------|-------------------------|
| petId  | number | ✓        | Positive integer pet ID |

**Success (200)**

```json
{
  "message": "Pet deleted successfully"
}
```

**Errors**

- `400` – Invalid `petId`
- `401` – `"Unauthorized: Token missing"`
- `403` – Pet does not belong to this owner
- `404` – Pet not found
- `500` – `"Internal server error"`

---

### PUT /pet-owner/user

Update the owner’s user profile (name, contact info, etc.).

**Headers**

- `Authorization: Bearer <accessToken>`

**Content-Type**

- `multipart/form-data`
  - `image` – profile image file (optional)
  - `body` – JSON string (required)

**Form field `body` (JSON string)**

| Field            | Type    | Required | Constraints                                                   |
|------------------|---------|----------|---------------------------------------------------------------|
| name             | string  | ✓        | 2–100 characters                                              |
| phone            | string  | ✓        | `0xxxxxxxxx` (10 digits)                                      |
| idNumber         | string  | -        | 13 digits, valid Thai ID                                      |
| dateOfBirth      | string  | -        | `YYYY-MM-DD`, must be a past date                             |
| email            | string  | -        | If changed, must be provided together with `password`         |
| password         | string  | -        | Minimum 12 characters (required when changing `email`)        |
| removeProfileImg | boolean | -        | If true, removes the existing profile image                   |

If none of the updatable fields are provided, the middleware returns:

```json
{
  "error": "No fields to update"
}
```


**Success (200)**

```json
{
  "message": "Updated successfully"
}
```

**Errors**

- `400` – Invalid body (`UserMiddleware.updateUserBody`)
- `401` – `"Unauthorized: Token missing"`
- `403` – Forbidden (role is not owner)
- `500` – `"Internal server error"`

---

## Pet Sitter – `/pet-sitter`

### GET /pet-sitter/

Get a paginated list of approved pet sitters with filters.

**Auth**: Not required.

**Query Parameters**

| Param      | Type   | Required | Description                                                                 |
|-----------|--------|----------|-----------------------------------------------------------------------------|
| page      | number | -        | Page number, positive integer, default `1`                                  |
| limit     | number | -        | Page size, positive integer, default `5`, max `20`                          |
| keyword   | string | -        | Search keyword (trimmed)                                                    |
| pet_type  | string | -        | Comma-separated pet types, e.g. `Dog,Cat`                                   |
| rating    | number | -        | Integer rating between 1 and 5                                              |
| experience| string | -        | Range of years, e.g. `1-5` or `10-` (open upper bound)                      |
| seed      | string | -        | Seed used for ordering; default is current date in `yyyyMMdd` format       |
| lat       | number | -        | Latitude for location search (`-90` to `90`)                                |
| lon       | number | -        | Longitude for location search (`-180` to `180`)                              |
| radius    | number | -        | Search radius in meters, positive number                                     |

Location search rules:
- If `lat/lon` are omitted, endpoint behavior remains unchanged.
- If `lat/lon` are provided on page `1` without `radius`, backend auto-expands radius until enough results are found or max radius is reached.
- For page `2+`, frontend should send the same `radius` used on page `1` to avoid missing or duplicate items.

**Success (200)**

```json
{
  "totalPetSitters": 10,
  "totalPages": 2,
  "currentPage": 1,
  "limit": 5,
  "meta": {
    "radiusUsed": 10000,
    "hasMore": true
  },
  "sitters": [
    {
      "id": 1,
      "sitter": {
        "name": "string",
        "profileImgUrl": "string | null"
      },
      "imgUrl": "string",
      "tradeName": "string",
      "rating": 4.5,
      "petTypes": ["Dog", "Cat"],
      "latitude": 13.7563,
      "longitude": 100.5018,
      "province": "string",
      "district": "string"
    }
  ]
}
```

`meta` is returned only when location search is used (`lat/lon` provided).

**Errors**

- `400` – Invalid query parameters (page/limit/rating/pet_type/experience)
- `500` – `"Internal server error"`

---

### GET /pet-sitter/:sitterId

Get public details for a single approved pet sitters.

**Auth**: Not required.

**Path Parameters**

| Param    | Type   | Required | Description                 |
|----------|--------|----------|-----------------------------|
| sitterId | number | ✓        | Positive integer sitter ID  |

**Success (200)**

```json
{
  "id": 1,
  "sitter": {
    "name": "string",
    "profileImgUrl": "string | null"
  },
  "imgUrls": ["string"],
  "tradeName": "string",
  "experience": 5,
  "reviewCount": 10,
  "rating": 4.7,
  "petTypes": ["Dog", "Cat"],
  "introduction": "string | null",
  "services": "string | null",
  "description": "string | null",
  "address": "string",
  "latitude": 13.7563,
  "longitude": 100.5018,
  "province": "string",
  "district": "string",
  "subDistrict": "string",
  "postCode": "string"
}
```

**Errors**

- `400` – `"Sitter ID must be a positive integer"`
- `404` – Sitter not found
- `500` – `"Internal server error"`

---

### GET /pet-sitter/profile

Get the sitter profile for the currently authenticated sitter.

**Headers**

- `Authorization: Bearer <accessToken>` (**role = sitter**)

**Success (200)**

```json
{
  "id": 1,
  "sitter": {
    "id": "string",
    "name": "string",
    "phone": "string",
    "profileImgUrl": "string | null",
    "email": "string",
    "status": "Normal" | "Banned"
  },
  "imgUrls": ["string"],
  "tradeName": "string",
  "experience": 5,
  "reviewCount": 10,
  "rating": 4.7,
  "petTypes": ["Dog", "Cat"],
  "introduction": "string | null",
  "services": "string | null",
  "description": "string | null",
  "address": "string",
  "latitude": 13.7563,
  "longitude": 100.5018,
  "province": "string",
  "district": "string",
  "subDistrict": "string",
  "postCode": "string"
}
```

**Errors**

- `401` – `"Unauthorized: Token missing"`
- `403` – Forbidden (role is not sitter)
- `404` – Sitter profile not found
- `500` – `"Internal server error"`

---

### PUT /pet-sitter/profile

Request an update to the sitter profile (pending approval by admin).

**Headers**

- `Authorization: Bearer <accessToken>` (**role = sitter**)

**Content-Type**

- `multipart/form-data`
  - `images` – up to 10 image files (optional)
  - `body` – JSON string (required)

**Form field `body` (JSON string)**

All fields are optional, but at least one must be present. Validation rules:

| Field         | Type             | Required | Constraints                                                                 |
|--------------|------------------|----------|-----------------------------------------------------------------------------|
| experience   | number \| null   | -        | `0 ≤ value < 100`, at most 1 decimal place                                 |
| tradeName    | string \| null   | -        | 5–50 characters                                                             |
| petTypeIds   | number[] \| null | -        | Non-empty array of numbers                                                  |
| introduction | string \| null   | -        | If provided, at least 10 characters                                         |
| services     | string \| null   | -        | If provided, at least 10 characters                                         |
| description  | string \| null   | -        | If provided, at least 10 characters                                         |
| address      | string \| null   | -        | 10–100 characters                                                           |
| latitude     | number \| null   | -        | Between -90 and 90                                                          |
| longitude    | number \| null   | -        | Between -180 and 180                                                        |
| provinceId   | number \| null   | -        | Positive integer between 10 and 96                                          |
| districtId   | number \| null   | -        | Positive integer between 1001 and 9699                                      |
| subDistrictId| number \| null   | -        | Positive integer between 100101 and 969999                                  |
| existingImages | { url: string; order: number }[] | - | Array of existing image metadata, no duplicate URLs or orders, order ≥ 0   |

If none of the updatable fields are provided, the middleware returns:

```json
{
  "error": "No fields to update"
}
```

**Success (200)**

```json
{
  "message": "Updated successfully"
}
```

This means the update request has been stored (and may be pending admin approval).

**Errors**

- `400` – Validation errors (see messages from `SitterMiddleware.updateSitterBody`)
- `401` – `"Unauthorized: Token missing"`
- `403` – Forbidden (role is not sitter)
- `500` – `"Internal server error"`

---

### PUT /pet-sitter/user

Update the sitter’s user profile (same rules as owner profile update).

**Headers**

- `Authorization: Bearer <accessToken>` (**role = sitter**)

**Content-Type**

- `multipart/form-data`
  - `image` – profile image file (optional)
  - `body` – JSON string (required)

**Form field `body` (JSON string)**

Fields and constraints are the same as `PUT /pet-owner/user`:

| Field            | Type    | Required | Constraints                                                   |
|------------------|---------|----------|---------------------------------------------------------------|
| name             | string  | ✓        | 2–100 characters                                              |
| phone            | string  | ✓        | `0xxxxxxxxx` (10 digits)                                      |
| idNumber         | string  | -        | 13 digits, valid Thai ID                                      |
| dateOfBirth      | string  | -        | `YYYY-MM-DD`, must be a past date                             |
| email            | string  | -        | If changed, must be provided together with `password`         |
| password         | string  | -        | Minimum 12 characters (required when changing `email`)        |
| removeProfileImg | boolean | -        | If true, removes the existing profile image                   |

If none of the updatable fields are provided, the middleware returns:

```json
{
  "error": "No fields to update"
}
```

**Success (200)**

```json
{
  "message": "Updated successfully"
}
```

**Errors**

- `400` – Invalid body (`UserMiddleware.updateUserBody`)
- `401` – `"Unauthorized: Token missing"`
- `403` – Forbidden (role is not sitter)
- `500` – `"Internal server error"`

---

## Address – `/address`

Endpoints for retrieving Thai administrative divisions.

### GET /address/provinces

Get all provinces.

**Auth**: Not required.

**Success (200)**

```json
[
  {
    "id": 10,
    "name": "Bangkok"
  }
]
```

**Errors**

- `500` – `"Internal server error"`

---

### GET /address/provinces/:provinceId/districts

Get districts for a given province.

**Auth**: Not required.

**Path Parameters**

| Param       | Type   | Required | Description                                  |
|-------------|--------|----------|----------------------------------------------|
| provinceId  | number | ✓        | Must be a valid province ID (10–96)          |

**Success (200)**

```json
[
  {
    "id": 1001,
    "name": "Some District"
  }
]
```

**Errors**

- `400` – Invalid province ID (from `AddressMiddleware.provinceId`)
- `500` – `"Internal server error"`

---

### GET /address/districts/:districtId/sub-districts

Get sub-districts for a given district.

**Auth**: Not required.

**Path Parameters**

| Param      | Type   | Required | Description                                   |
|------------|--------|----------|-----------------------------------------------|
| districtId | number | ✓        | Must be a valid district ID (1001–9699)      |

**Success (200)**

```json
[
  {
    "id": 100101,
    "name": "Some Subdistrict",
    "postCode": "10100"
  }
]
```

**Errors**

- `400` – Invalid district ID (from `AddressMiddleware.districtId`)
- `500` – `"Internal server error"`

---

## Admin – `/admin`

All `/admin` endpoints require:

- `Authorization: Bearer <accessToken>` with **role = admin**

### GET /admin/pet-owner

Get a paginated list of pet owners for admin management.

**Headers**

- `Authorization: Bearer <accessToken>` (**role = admin**)

**Query Parameters**

| Param   | Type   | Required | Description                                                                 |
|---------|--------|----------|-----------------------------------------------------------------------------|
| seed    | string | -        | Seed for ordering; default is current date in `yyyyMMdd` format            |
| page    | number | -        | Page number, positive integer, default `1`                                  |
| limit   | number | -        | Page size, default `8`, max `20`                                           |
| keyword | string | -        | Search keyword (trimmed)                                                   |
| status  | string | -        | `"Normal"` or `"Banned"`                                                   |

**Success (200)**

```json
{
  "totalOwners": 10,
  "totalPages": 2,
  "currentPage": 1,
  "limit": 8,
  "owners": [
    {
      "id": "string",
      "name": "string",
      "phone": "string",
      "profileImgUrl": "string | null",
      "email": "string",
      "status": "Normal" | "Banned",
      "petCount": 3
    }
  ]
}
```

**Errors**

- `400` – Invalid `status` (from `AdminMiddleware.getOwnersQuery`)
- `401` – `"Unauthorized: Token missing"`
- `403` – Forbidden (role is not admin)
- `500` – `"Internal server error"`

---

### GET /admin/pet-owner/:userId

Get detailed information about a specific owner by user ID.

**Headers**

- `Authorization: Bearer <accessToken>` (**role = admin**)

**Path Parameters**

| Param  | Type   | Required | Description             |
|--------|--------|----------|-------------------------|
| userId | string | ✓        | User ID of the owner    |

**Success (200)**

```json
{
  "id": "string",
  "name": "string",
  "phone": "string",
  "profileImgUrl": "string | null",
  "idNumber": "string | null",
  "dateOfBirth": "string | null",
  "email": "string",
  "status": "Normal" | "Banned",
  "pets": [
    {
      "id": 1,
      "imgUrl": "string",
      "petName": "string",
      "petType": "string"
    }
  ]
}
```

**Errors**

- `400` – Invalid user ID (from `UserMiddleware.userId`)
- `401` – Unauthorized
- `403` – Forbidden (role is not admin)
- `404` – Owner not found
- `500` – `"Internal server error"`

---

### GET /admin/pet-sitter

Get a paginated list of sitters for admin management.

**Headers**

- `Authorization: Bearer <accessToken>` (**role = admin**)

**Query Parameters**

| Param      | Type   | Required | Description                                                                 |
|-----------|--------|----------|-----------------------------------------------------------------------------|
| seed      | string | -        | Seed for ordering; default is current date in `yyyyMMdd` format            |
| page      | number | -        | Page number, positive integer, default `1`                                  |
| limit     | number | -        | Page size, default `8`                                                     |
| keyword   | string | -        | Search keyword (trimmed)                                                   |
| pet_type  | string | -        | Comma-separated pet types                                                  |
| rating    | number | -        | Integer rating between 1 and 5                                             |
| experience| string | -        | Range, e.g. `1-5` or `10-`                                                 |
| status    | string | -        | One of `SITTER_STATUS` or `"Banned"` (see backend enum)                    |

**Success (200)**

```json
{
  "totalSitters": 10,
  "totalPages": 2,
  "currentPage": 1,
  "limit": 8,
  "sitters": [
    {
      "id": 1,
      "sitter": {
        "id": "string",
        "name": "string",
        "phone": "string",
        "profileImgUrl": "string | null",
        "email": "string",
        "status": "Normal" | "Banned"
      },
      "tradeName": "string",
      "hasPendingUpdate": "boolean",
      "status": "Pending" | "Approved" | "Rejected" | "Banned"
    }
  ]
}
```

**Errors**

- `400` – Invalid sitter `status` (from `AdminMiddleware.getSittersQuery`) or other query validation
- `401` – Unauthorized
- `403` – Forbidden (role is not admin)
- `500` – `"Internal server error"`

---

### GET /admin/pet-sitter/:sitterId

Get detailed information about a sitter by sitter ID for admin.

**Headers**

- `Authorization: Bearer <accessToken>` (**role = admin**)

**Path Parameters**

| Param    | Type   | Required | Description                 |
|----------|--------|----------|-----------------------------|
| sitterId | number | ✓        | Positive integer sitter ID  |

**Success (200)**

```json
{
  "id": 1,
  "sitter": {
    "id": "string",
    "name": "string",
    "phone": "string",
    "profileImgUrl": "string | null",
    "email": "string",
    "status": "Normal" | "Banned"
  },
  "imgUrls": ["string"],
  "tradeName": "string",
  "experience": 5,
  "petTypes": ["Dog", "Cat"],
  "introduction": "string | null",
  "services": "string | null",
  "description": "string | null",
  "address": "string",
  "latitude": 13.7563,
  "longitude": 100.5018,
  "province": "string",
  "district": "string",
  "subDistrict": "string",
  "postCode": "string",
  "hasPendingUpdate": "boolean",
  "status": "Pending" | "Approved" | "Rejected" | "Banned"
}
```

**Errors**

- `400` – `"Sitter ID must be a positive integer"`
- `401` – Unauthorized
- `403` – Forbidden (role is not admin)
- `404` – Sitter not found
- `500` – `"Internal server error"`

---

### PATCH /admin/ban/:userId

Ban a user (owner or sitter).

**Headers**

- `Authorization: Bearer <accessToken>` (**role = admin**)

**Path Parameters**

| Param  | Type   | Required | Description      |
|--------|--------|----------|------------------|
| userId | string | ✓        | Target user ID   |

**Success (200)**

```json
{
  "message": "User banned successfully"
}
```

**Errors**

- `400` – Invalid user ID (from `UserMiddleware.userId`)
- `401` – Unauthorized
- `403` – Forbidden (role is not admin)
- `404` – User not found
- `500` – `"Internal server error"`

---

### PATCH /admin/unban/:userId

Unban a previously banned user.

**Headers**

- `Authorization: Bearer <accessToken>` (**role = admin**)

**Path Parameters**

| Param  | Type   | Required | Description      |
|--------|--------|----------|------------------|
| userId | string | ✓        | Target user ID   |

**Success (200)**

```json
{
  "message": "User unbanned successfully"
}
```

**Errors**

- `400` – Invalid user ID
- `401` – Unauthorized
- `403` – Forbidden (role is not admin)
- `404` – User not found
- `500` – `"Internal server error"`

---

### PATCH /admin/pet-sitter/approve/:sitterId

Approve a pending sitter profile update.

**Headers**

- `Authorization: Bearer <accessToken>` (**role = admin**)

**Path Parameters**

| Param    | Type   | Required | Description                 |
|----------|--------|----------|-----------------------------|
| sitterId | number | ✓        | Positive integer sitter ID  |

**Success (200)**

```json
{
  "message": "Update approved successfully"
}
```

**Errors**

- `400` – Invalid sitter ID
- `401` – Unauthorized
- `403` – Forbidden (role is not admin)
- `404` – Sitter or pending update not found
- `500` – `"Internal server error"`

---

### PATCH /admin/pet-sitter/reject/:sitterId

Reject a pending sitter profile update.

**Headers**

- `Authorization: Bearer <accessToken>` (**role = admin**)

**Path Parameters**

| Param    | Type   | Required | Description                 |
|----------|--------|----------|-----------------------------|
| sitterId | number | ✓        | Positive integer sitter ID  |

**Success (200)**

```json
{
  "message": "Update rejected successfully"
}
```

**Errors**

- `400` – Invalid sitter ID
- `401` – Unauthorized
- `403` – Forbidden (role is not admin)
- `404` – Sitter or pending update not found
- `500` – `"Internal server error"`

---

## Summary Table

### Public and Auth Endpoints

| Method | Path                           | Auth      | Role    | Description                           |
|--------|--------------------------------|-----------|---------|---------------------------------------|
| GET    | /                              | -         | -       | Welcome                                |
| GET    | /health                        | -         | -       | Health check                           |
| GET    | /auth/get-user                 | Bearer    | any     | Get current user                       |
| POST   | /auth/register                 | -         | -       | Register                               |
| POST   | /auth/login                    | -         | -       | Login                                  |
| PUT    | /auth/reset-password           | Bearer    | any     | Reset password                         |
| GET    | /pet/type                      | -         | -       | List pet types                         |
| GET    | /pet-owner/pet                 | Bearer    | owner   | List my pets                           |
| GET    | /pet-owner/pet/:petId          | Bearer    | owner   | Get pet by ID                          |
| POST   | /pet-owner/pet                 | Bearer    | owner   | Create pet                             |
| PUT    | /pet-owner/pet/:petId          | Bearer    | owner   | Update pet                             |
| DELETE | /pet-owner/pet/:petId          | Bearer    | owner   | Delete pet                             |
| PUT    | /pet-owner/user                | Bearer    | owner   | Update owner profile                   |
| GET    | /pet-sitter/                   | -         | -       | List sitters (filter)                  |
| GET    | /pet-sitter/:sitterId          | -         | -       | Get sitter by ID                       |
| GET    | /pet-sitter/profile            | Bearer    | sitter  | Get current sitter profile             |
| PUT    | /pet-sitter/                   | Bearer    | sitter  | Update sitter profile (pending)        |
| PUT    | /pet-sitter/user               | Bearer    | sitter  | Update sitter user profile             |
| GET    | /address/provinces             | -         | -       | List provinces                         |
| GET    | /address/provinces/:provinceId/districts | - | -       | List districts in a province           |
| GET    | /address/districts/:districtId/sub-districts | - | - | List sub-districts in a district       |

### Admin Endpoints

| Method | Path                          | Auth   | Role  | Description                        |
|--------|-------------------------------|--------|-------|------------------------------------|
| GET    | /admin/pet-owner              | Bearer | admin | List owners                        |
| GET    | /admin/pet-owner/:userId      | Bearer | admin | Get owner details by user ID       |
| GET    | /admin/pet-sitter             | Bearer | admin | List sitters                       |
| GET    | /admin/pet-sitter/:sitterId   | Bearer | admin | Get sitter details by sitter ID    |
| PATCH  | /admin/ban/:userId            | Bearer | admin | Ban user                           |
| PATCH  | /admin/unban/:userId          | Bearer | admin | Unban user                         |
| PATCH  | /admin/pet-sitter/approve/:sitterId | Bearer | admin | Approve sitter profile update      |
| PATCH  | /admin/pet-sitter/reject/:sitterId  | Bearer | admin | Reject sitter profile update       |

# Pet Sitter Server – API Documentation

## Overview

REST API สำหรับ Pet Sitter application รองรับบทบาท **owner** (เจ้าของสัตว์เลี้ยง) และ **sitter** (พี่เลี้ยงสัตว์)

- **Base URL:** `http://localhost:4000` (หรือตาม `PORT` ใน env)
- **Content-Type:** `application/json`
- **Allowed methods:** GET, POST, PUT, DELETE

---

## Authentication

Endpoints ที่ต้องยืนยันตัวตน ใช้ **Bearer token** ใน header:

```http
Authorization: Bearer <accessToken>
```

`accessToken` ได้จาก `POST /auth/login`

---

## General

### Root

| Method | Path       | Description                     |
|--------|------------|---------------------------------|
| GET    | `/`        | Welcome message                 |
| GET    | `/health`  | Health check (status, timestamp) |

### Error Response

เมื่อเกิด error ทุก endpoint จะตอบในรูปแบบ:

```json
{
  "error": "Error message string"
}
```

- `400` – Validation / Bad request  
- `401` – Unauthorized (ไม่มี token หรือ token ไม่ถูกต้อง)  
- `403` – Forbidden (role ไม่ตรง)  
- `404` – Not found  
- `500` – Internal server error  

---

## Auth – `/auth`

### GET /auth/get-user

ดึงข้อมูล user จาก token (ต้องส่ง `Authorization: Bearer <token>`)

**Headers:**  
`Authorization: Bearer <accessToken>`

**Success (200):**

```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "phone": "string",
  "profileImgUrl": "string | null",
  "role": "owner" | "sitter" | "admin"
}
```

**Error:** `401` – Token missing / Invalid token

---

### POST /auth/register

สมัครสมาชิก

**Body (JSON):**

| Field    | Type   | Required | Constraints                          |
|----------|--------|----------|--------------------------------------|
| email    | string | ✓        | Valid email format                   |
| phone    | string | ✓        | 10 digits, 0xxxxxxxxx                |
| password | string | ✓        | Min 12 characters                    |
| role     | string | ✓        | `"owner"` \| `"sitter"` (ไม่รับ `"admin"`) |

**Success (201):**

```json
{
  "message": "User registered successfully"
}
```

**Error:** `400` – Body/validation errors (ตามที่ middleware ส่งกลับ)

---

### POST /auth/login

เข้าสู่ระบบ

**Body (JSON):**

| Field    | Type   | Required | Constraints        |
|----------|--------|----------|--------------------|
| email    | string | ✓        | Valid email        |
| password | string | ✓        | Min 12 characters  |

**Success (200):**

```json
{
  "message": "Logged in successfully",
  "accessToken": "string"
}
```

**Error:** `400` / `401` ตามที่ service ส่งกลับ

---

### PUT /auth/reset-password

เปลี่ยนรหัสผ่าน (ต้องล็อกอินแล้ว)

**Headers:**  
`Authorization: Bearer <accessToken>`

**Body (JSON):**

| Field       | Type   | Required | Constraints       |
|-------------|--------|----------|-------------------|
| oldPassword | string | ✓        | Min 12 characters |
| newPassword | string | ✓        | Min 12 characters |

**Success (200):**

```json
{
  "message": "Password reset successfully"
}
```

**Error:** `401` – Token missing; อื่นๆ ตามที่ service ส่งกลับ

---

## Pet Owner – `/pet-owner`

Endpoints ด้านล่างต้องใช้ token ของ user ที่มี **role = owner**  
ส่ง header: `Authorization: Bearer <accessToken>`

### GET /pet-owner/pet

รายการสัตว์เลี้ยงของ owner ที่ล็อกอินอยู่

**Success (200):** Array of pets

```json
[
  {
    "id": 1,
    "imgUrl": "string",
    "petName": "string",
    "petType": "string"
  }
]
```

**Error:** `401`, `403` (ไม่ใช่ owner), `500`

---

### GET /pet-owner/pet/:petId

ดูข้อมูลสัตว์เลี้ยงหนึ่งตัว

**Params:**  
`petId` – positive integer

**Success (200):**

```json
{
  "id": 1,
  "imgUrl": "string",
  "petName": "string",
  "petType": "string",
  "sex": "Male" | "Female" | "Unknown",
  "breed": "string",
  "dateOfBirth": "string",
  "color": "string",
  "weight": "number",
  "about": "string | null"
}
```

**Error:** `400` (petId invalid), `401`, `403`, `404`, `500`

---

### POST /pet-owner/pet

สร้างสัตว์เลี้ยงใหม่

**Content-Type:** `multipart/form-data`  
- `image` – ไฟล์รูป (required)  
- `body` – JSON string (required)

**body (JSON string ใน form field `body`):**

| Field       | Type   | Required | Constraints                          |
|-------------|--------|----------|--------------------------------------|
| petName     | string | ✓        | 2–50 chars, alphanumeric + space      |
| petTypeId   | number | ✓        | -                                    |
| sex         | string | ✓        | `"Male"` \| `"Female"` \| `"Unknown"` |
| breed       | string | ✓        | 2–100 chars                          |
| dateOfBirth | string | ✓        | YYYY-MM-DD, ต้องเป็นวันในอดีต         |
| color       | string | ✓        | 2–100 chars                          |
| weight      | number | ✓        | 0 < weight < 1000, สูงสุด 2 ทศนิยม   |
| about       | string | -        | 5–500 chars                          |

**Success (201):**

```json
{
  "message": "Pet created successfully"
}
```

**Error:** `400` (validation), `401`, `403`, `500`

---

### PUT /pet-owner/pet/:petId

แก้ไขสัตว์เลี้ยง

**Content-Type:** `multipart/form-data`  
- `image` – ไฟล์รูป (optional)  
- `body` – JSON string (required) โครงสร้างเดียวกับ POST pet ด้านบน

**Params:**  
`petId` – positive integer

**Success (200):**

```json
{
  "message": "Pet updated successfully"
}
```

**Error:** `400`, `401`, `403`, `404`, `500`

---

### DELETE /pet-owner/pet/:petId

ลบสัตว์เลี้ยง

**Params:**  
`petId` – positive integer

**Success (200):**

```json
{
  "message": "Pet deleted successfully"
}
```

**Error:** `400`, `401`, `403`, `404`, `500`

---

### PUT /pet-owner/user

อัปเดตโปรไฟล์ผู้ใช้ (owner)

**Content-Type:** `multipart/form-data`  
- `image` – ไฟล์รูป (optional)  
- `body` – JSON string (required)

**body (JSON string):**

| Field            | Type    | Required | Constraints                     |
|------------------|---------|----------|---------------------------------|
| name             | string  | ✓        | 2–100 chars, name pattern       |
| phone            | string  | ✓        | 0xxxxxxxxx                      |
| idNumber         | string  | -        | 13 digits, valid Thai ID        |
| dateOfBirth      | string  | -        | YYYY-MM-DD, อดีต                |
| email            | string  | -        | ถ้าเปลี่ยนต้องส่งคู่กับ password  |
| password         | string  | -        | Min 12 chars (คู่กับ email)     |
| removeProfileImg | boolean | -        | ลบรูปโปรไฟล์                    |

**Success (200):**

```json
{
  "message": "Updated successfully"
}
```

**Error:** `400`, `401`, `403`, `500`

---

## Pet Sitter – `/pet-sitter`

### GET /pet-sitter/

รายการ pet sitter (filter, pagination) – **ไม่ต้องส่ง token**

**Query:**

| Param      | Type   | Required | Description                                      |
|-----------|--------|----------|--------------------------------------------------|
| page      | number | -        | หน้า (default 1), positive integer              |
| limit     | number | -        | จำนวนต่อหน้า (default 5, max 20)                |
| keyword   | string | -        | ค้นหา (trimmed)                                  |
| pet_type  | string | -        | Comma-separated pet types (เช่น `Dog,Cat`)       |
| rating    | number | -        | 1–5 (integer)                                    |
| experience| string | -        | Range เช่น `1-5` หรือ `10-` (เปิดปลาย)           |
| seed      | string | -        | สำหรับการเรียง (default วันปัจจุบัน yyyyMMdd)     |
| lat       | number | -        | พิกัดละติจูด (`-90` ถึง `90`)                     |
| lon       | number | -        | พิกัดลองจิจูด (`-180` ถึง `180`)                   |
| radius    | number | -        | รัศมีการค้นหา (เมตร), ต้องมากกว่า 0                |

กติกา location search:
- ถ้าไม่ส่ง `lat/lon` จะทำงานเหมือนเดิมทุกอย่าง
- ถ้าส่ง `lat/lon` และเป็น `page=1` โดยไม่ส่ง `radius` ระบบจะ auto-expand radius อัตโนมัติ
- หน้า `2+` ควรส่ง `radius` เดิมที่ได้จากหน้าแรก เพื่อป้องกันข้อมูลซ้ำหรือหาย

**Success (200):**

```json
{
  "totalPetSitters": "number",
  "totalPages": "number",
  "currentPage": "number",
  "limit": "number",
  "meta": {
    "radiusUsed": "number",
    "hasMore": "boolean"
  },
  "sitters": [
    {
      "id": "number",
      "sitter": "object",
      "imgUrl": "string",
      "tradeName": "string",
      "rating": "number",
      "petTypes": "array",
      "latitude": "number",
      "longitude": "number",
      "province": "string",
      "district": "string"
    }
  ]
}
```

`meta` จะถูกส่งกลับเฉพาะตอนที่เป็น location search (`lat/lon` ถูกส่งมา)

**Error:** `400` (query validation), `500`

---

### GET /pet-sitter/:sitterId

ดูรายละเอียด sitter คนเดียว – **ไม่ต้องส่ง token**

**Params:**  
`sitterId` – positive integer

**Success (200):**

```json
{
  "id": "number",
  "sitter": "object",
  "imgUrls": "array",
  "tradeName": "string",
  "experience": "number",
  "reviewCount": "number",
  "rating": "number",
  "petTypes": "array",
  "introduction": "string",
  "services": "string",
  "description": "string",
  "address": "string",
  "latitude": "number",
  "longitude": "number",
  "province": "string",
  "district": "string",
  "subDistrict": "string",
  "postCode": "string"
}
```

**Error:** `400` (sitterId invalid), `404`, `500`

---

### PUT /pet-sitter/

อัปเดตโปรไฟล์ sitter (ต้องเป็น role **sitter**)

**Headers:**  
`Authorization: Bearer <accessToken>`

**Content-Type:** `multipart/form-data`  
- `images` – รูปได้สูงสุด 10 ไฟล์  
- `body` – JSON string (required)

**body (JSON string):**

| Field         | Type    | Required | Constraints                         |
|--------------|---------|----------|-------------------------------------|
| experience   | number  | ✓        | 0 ≤ experience < 100, ทศนิยมสูงสุด 1 ตำแหน่ง |
| tradeName    | string  | ✓        | 5–50 chars                          |
| petTypeIds   | number[]| ✓        | Array of numbers                    |
| introduction | string  | -        | ถ้ามีต้อง ≥ 10 chars                |
| services     | string  | -        | ถ้ามีต้อง ≥ 10 chars                |
| description  | string  | -        | ถ้ามีต้อง ≥ 10 chars                |
| address      | string  | ✓        | 10–100 chars                        |
| latitude     | number  | ✓        | -90 ถึง 90                          |
| longitude    | number  | ✓        | -180 ถึง 180                        |
| provinceId   | number  | ✓        | -                                   |
| districtId   | number  | ✓        | -                                   |
| subDistrictId| number  | ✓        | -                                   |

**Success (200):**

```json
{
  "message": "Updated successfully"
}
```

**Error:** `400`, `401`, `403`, `500`

---

### PUT /pet-sitter/user

อัปเดตโปรไฟล์ผู้ใช้ (sitter) – รูปแบบ request เหมือน `PUT /pet-owner/user` (body + image ใน multipart)

**Headers:**  
`Authorization: Bearer <accessToken>`

**Success (200):**

```json
{
  "message": "Updated successfully"
}
```

**Error:** `400`, `401`, `403`, `500`

---

## Admin – `/admin`

Endpoints สำหรับผู้ดูแลระบบ (**role = admin**)  
ทุก endpoint ต้องส่ง header: `Authorization: Bearer <accessToken>`

### GET /admin/pet-owner

ดึงรายการ pet owner สำหรับหน้า Admin

**Query:**

| Param   | Type   | Required | Description                                                                 |
|---------|--------|----------|-----------------------------------------------------------------------------|
| seed    | string | -        | ค่า seed สำหรับการสุ่ม/เรียง (default เป็นวันที่วันนี้ในรูปแบบ yyyyMMdd)       |
| page    | number | -        | หน้า (default 1), ต้องเป็น integer > 0                                     |
| limit   | string | -        | จำนวนต่อหน้า (default 8, middleware จำกัดสูงสุด 20) (trimmed)                |
| keyword | string | -        | คำค้นหา (trimmed)                                                          |
| status  | string | -        | สถานะของ user `"Normal"`, `"Banned"`                                       |

**Success (200):**

```json
{
  "totalOwners": "number",
  "totalPages": "number",
  "currentPage": "number",
  "limit": "number",
  "owners": [
    {
      "id": "string",
      "name": "string",
      "phone": "string",
      "profileImgUrl": "string | null",
      "email": "string",
      "status": "Normal" | "Banned",
      "petCount": "number"
    }
  ]
}
```

---

## Summary Table

| Method | Path                      | Auth     | Role   | Description           |
|--------|---------------------------|----------|--------|------------------------|
| GET    | /                         | -        | -      | Welcome                |
| GET    | /health                   | -        | -      | Health check           |
| GET    | /auth/get-user            | Bearer   | -      | Get current user       |
| POST   | /auth/register            | -        | -      | Register               |
| POST   | /auth/login               | -        | -      | Login                  |
| PUT    | /auth/reset-password      | Bearer   | -      | Reset password         |
| GET    | /pet-owner/pet            | Bearer   | owner  | List my pets           |
| GET    | /pet-owner/pet/:petId     | Bearer   | owner  | Get pet by id          |
| POST   | /pet-owner/pet            | Bearer   | owner  | Create pet             |
| PUT    | /pet-owner/pet/:petId     | Bearer   | owner  | Update pet             |
| DELETE | /pet-owner/pet/:petId     | Bearer   | owner  | Delete pet             |
| PUT    | /pet-owner/user           | Bearer   | owner  | Update owner profile   |
| GET    | /pet-sitter/              | -        | -      | List sitters (filter)  |
| GET    | /pet-sitter/:sitterId     | -        | -      | Get sitter by id       |
| PUT    | /pet-sitter/              | Bearer   | sitter | Update sitter profile  |
| PUT    | /pet-sitter/user          | Bearer   | sitter | Update sitter user     |

