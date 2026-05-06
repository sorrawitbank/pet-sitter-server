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

## Contents

- [Authentication](#authentication)
- [General](#general)
- [Auth - `/api/auth`](#auth---apiauth)
- [Pet - `/api/pet`](#pet---apipet)
- [Pet Owner - `/api/pet-owner`](#pet-owner---apipet-owner)
- [Pet Sitter - `/api/pet-sitter`](#pet-sitter---apipet-sitter)
- [Admin - `/api/admin`](#admin---apiadmin)
- [Address - `/api/address`](#address---apiaddress)
- [Booking - `/api/bookings`](#booking---apibookings)
- [Payment - `/api/payment`](#payment---apipayment)
- [Review - `/api/reviews`](#review---apireviews)
- [Chat - `/api/chat`](#chat---apichat)
- [Report - `/api/reports`](#report---apireports)
- [Webhook - `/api/webhook/stripe`](#webhook---apiwebhookstripe)

---

## Authentication

Endpoints that require authentication use a **Bearer token** in the `Authorization` header:

```http
Authorization: Bearer <accessToken>
```

The `accessToken` is obtained from `POST /api/auth/login`.

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

| Method | Path      | Description                            |
| ------ | --------- | -------------------------------------- |
| GET    | `/`       | Welcome message string                 |
| GET    | `/health` | Health check with status and timestamp |

### Error Response (Generic Shape)

Most error responses follow this general shape:

```json
{
  "error": "Error message string"
}
```

Common status codes:

- `400` - Validation / bad request
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (role not allowed)
- `404` - Resource not found
- `500` - Internal server error

Individual endpoints may add more specific rules and messages.

---

## Auth - `/api/auth`

### GET /api/auth/get-user

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
  "idNumber": "string | null",
  "dateOfBirth": "string | null",
  "profileImgUrl": "string | null",
  "role": "owner" | "sitter" | "admin",
  "sitterId": "number | undefined"
}
```

If the user is a sitter and a sitter profile exists, `sitterId` is a number; otherwise it can be `undefined`.

**Errors**

- `401` - Missing token (e.g. `"Unauthorized: Token missing"`)
- `4xx` - Other client errors from auth service
- `500` - `"Internal server error"`

---

### POST /api/auth/register

Register a new user.

**Body (JSON)**

| Field    | Type   | Required | Constraints                                        |
| -------- | ------ | -------- | -------------------------------------------------- |
| email    | string | yes      | Valid email format                                 |
| phone    | string | yes      | 10 digits, `0xxxxxxxxx`                            |
| password | string | yes      | Minimum 12 characters                              |
| role     | string | yes      | `"owner"` \| `"sitter"` (`"admin"` is not allowed) |

**Success (201)**

```json
{
  "message": "User registered successfully"
}
```

**Validation errors from middleware (400)**

- `"Body is required"`
- `"Email is required"`
- `"Phone is required"`
- `"Password is required"`
- `"Role is required"`
- `"Invalid email address"`
- `"Phone must be a string"`
- `"Invalid phone number"`
- `"Password must be a string"`
- `"Password must be at least 12 characters long"`
- `"Invalid role"`
- `"Admin role cannot be registered"`

**Other errors**

- `4xx` - Business errors from service (for example duplicated email)
- `500` - `"An error occurred during registration"`

---

### POST /api/auth/login

Log in an existing user.

**Body (JSON)**

| Field    | Type   | Required | Constraints           |
| -------- | ------ | -------- | --------------------- |
| email    | string | yes      | Valid email format    |
| password | string | yes      | Minimum 12 characters |

**Success (200)**

```json
{
  "message": "Logged in successfully",
  "accessToken": "string"
}
```

**Validation errors from middleware (400)**

- `"Body is required"`
- `"Email is required"`
- `"Password is required"`
- `"Invalid email address"`
- `"Password must be a string"`
- `"Password must be at least 12 characters long"`

**Other errors**

- `4xx` - Invalid credentials or other business errors
- `500` - `"An error occurred during login"`

---

### PUT /api/auth/reset-password

Reset the password for the authenticated user.

**Headers**

- `Authorization: Bearer <accessToken>`

**Body (JSON)**

| Field       | Type   | Required | Constraints           |
| ----------- | ------ | -------- | --------------------- |
| oldPassword | string | yes      | Minimum 12 characters |
| newPassword | string | yes      | Minimum 12 characters |

**Success (200)**

```json
{
  "message": "Password reset successfully"
}
```

**Validation errors from middleware (400)**

- `"Body is required"`
- `"Old password is required"`
- `"New password is required"`
- `"Old password must be a string"`
- `"Old password must be at least 12 characters long"`
- `"New password must be a string"`
- `"New password must be at least 12 characters long"`

**Other errors**

- `401` - Missing token (e.g. `"Unauthorized: Token missing"`)
- `4xx` - Business errors from service (for example old password mismatch)
- `500` - `"Internal server error"`

---

### PATCH /api/auth/change-email

Change the user email after verifying the current password.

**Headers**

- `Authorization: Bearer <accessToken>`

**Body (JSON)**

| Field    | Type   | Required | Constraints           |
| -------- | ------ | -------- | --------------------- |
| email    | string | yes      | Valid email format    |
| password | string | yes      | Minimum 12 characters |

**Success (200)**

```json
{
  "message": "Changed email successfully. Please check mail in your new email for verification."
}
```

**Validation errors from middleware (400)**

- `"Body is required"`
- `"Email is required"`
- `"Password is required"`
- `"Invalid email address"`
- `"Password must be a string"`
- `"Password must be at least 12 characters long"`

**Other errors**

- `401` - Missing token (e.g. `"Unauthorized: Token missing"`)
- `4xx` - Business errors from service
- `500` - `"Internal server error"`

---

## Pet - `/api/pet`

### GET /api/pet/type

Get the list of available pet types.

**Auth**

Not required.

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

- `500` - `"Internal server error"`

---

## Pet Owner - `/api/pet-owner`

All endpoints in this section require:

- `Authorization: Bearer <accessToken>`
- Owner role (`ProtectMiddleware.owner`)

If a valid token is provided but the role is not owner:

- `403` - `"Forbidden: You do not have pet owner access"`

### GET /api/pet-owner/pet

Get all pets owned by the authenticated owner.

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

- `401` - Missing or invalid token
- `403` - Owner role required
- `500` - `"Internal server error"`

---

### GET /api/pet-owner/pet/:petId

Get details of a specific pet owned by the authenticated owner.

**Path params**

| Field | Type   | Required | Constraints      |
| ----- | ------ | -------- | ---------------- |
| petId | number | yes      | Positive integer |

**Success (200)**

```json
{
  "id": 1,
  "imgUrl": "string",
  "petName": "string",
  "petType": "Dog",
  "sex": "Male" | "Female" | "Unknown",
  "breed": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "color": "string",
  "weight": "12.5",
  "about": "string | null"
}
```

**Validation errors (400)**

- `"Pet ID must be a positive integer"`

**Other errors**

- `401` - Missing or invalid token
- `403` - Owner role required
- `404` - `"Pet not found or not owned by this owner"`
- `500` - `"Internal server error"`

---

### POST /api/pet-owner/pet

Create a new pet for the authenticated owner.

**Content-Type**

- `multipart/form-data`

**Form-data fields**

- `image` (file, required; allowed: `.png`, `.jpg`, `.jpeg`)
- `body` (stringified JSON, required)

`body` JSON shape:

| Field       | Type   | Required | Constraints                             |
| ----------- | ------ | -------- | --------------------------------------- |
| petName     | string | yes      | 2-50 chars, valid name format           |
| petTypeId   | number | yes      | Must exist in pet types                 |
| sex         | string | yes      | `"Male"` \| `"Female"` \| `"Unknown"`   |
| breed       | string | yes      | 2-100 chars                             |
| dateOfBirth | string | yes      | Valid date (`YYYY-MM-DD`) in the past   |
| color       | string | yes      | 2-100 chars                             |
| weight      | number | yes      | `0 <= weight < 1000`, max 2 decimals    |
| about       | string | no       | 5-500 chars (if provided and not empty) |

**Success (201)**

```json
{
  "message": "Pet created successfully"
}
```

**Validation/upload errors (400)**

- `"Image is required"` (from required file middleware)
- `"Only .png .jpg .jpeg allowed"`
- `"Body is required"` / `"Invalid JSON body"`
- Field-specific validation errors from pet middleware

**Other errors**

- `401` - Missing or invalid token
- `403` - Owner role required
- `404` - `"Pet type not found"` or `"User not found"`
- `500` - `"Internal server error"`

---

### PUT /api/pet-owner/pet/:petId

Update pet information for a specific owned pet.

**Content-Type**

- `multipart/form-data`

**Path params**

| Field | Type   | Required | Constraints      |
| ----- | ------ | -------- | ---------------- |
| petId | number | yes      | Positive integer |

**Form-data fields**

- `image` (file, optional; allowed: `.png`, `.jpg`, `.jpeg`)
- `body` (stringified JSON, required; at least 1 updatable field)

Updatable fields in `body`:

- `petName`, `petTypeId`, `sex`, `breed`, `dateOfBirth`, `color`, `weight`, `about`

**Success (200)**

```json
{
  "message": "Pet updated successfully"
}
```

**Validation/upload errors (400)**

- `"Pet ID must be a positive integer"`
- `"Body is required"` / `"Invalid JSON body"` / `"No fields to update"`
- `"Only .png .jpg .jpeg allowed"`
- Field-specific validation errors from pet middleware

**Other errors**

- `401` - Missing or invalid token
- `403` - Owner role required
- `404` - `"Pet type not found"` or `"Pet not found or not owned by this owner"`
- `500` - `"Internal server error"`

---

### PUT /api/pet-owner/profile

Update the authenticated owner profile.

**Content-Type**

- `multipart/form-data`

**Form-data fields**

- `image` (file, optional; allowed: `.png`, `.jpg`, `.jpeg`)
- `body` (stringified JSON, required)

Updatable fields in `body`:

| Field            | Type           | Required | Constraints                    |
| ---------------- | -------------- | -------- | ------------------------------ |
| name             | string         | no       | 2-100 chars, valid name format |
| phone            | string         | no       | Valid Thai phone format        |
| idNumber         | string \| null | no       | Valid ID format and checksum   |
| dateOfBirth      | string \| null | no       | Valid date in the past         |
| removeProfileImg | boolean        | no       | Must be boolean                |

At least one of `name`, `phone`, `idNumber`, or `dateOfBirth` must be provided.

**Success (200)**

```json
{
  "message": "Updated successfully"
}
```

**Validation/upload errors (400)**

- `"Body is required"` / `"Invalid JSON body"` / `"No fields to update"`
- `"Only .png .jpg .jpeg allowed"`
- Field-specific validation errors from user middleware

**Other errors**

- `401` - Missing or invalid token
- `403` - Owner role required
- `4xx` - Business errors from service
- `500` - `"Internal server error"`

---

### DELETE /api/pet-owner/pet/:petId

Delete a specific pet owned by the authenticated owner.

**Path params**

| Field | Type   | Required | Constraints      |
| ----- | ------ | -------- | ---------------- |
| petId | number | yes      | Positive integer |

**Success (200)**

```json
{
  "message": "Pet deleted successfully"
}
```

**Validation errors (400)**

- `"Pet ID must be a positive integer"`

**Other errors**

- `401` - Missing or invalid token
- `403` - Owner role required
- `404` - `"Pet not found or not owned by this owner"`
- `500` - `"Internal server error"`

---

## Pet Sitter - `/api/pet-sitter`

### GET /api/pet-sitter

Get paginated sitter list for discovery.

**Query params**

| Field      | Type   | Required | Notes                                                          |
| ---------- | ------ | -------- | -------------------------------------------------------------- |
| seed       | string | no       | Default is current date (`yyyyMMdd`)                           |
| page       | number | no       | Positive integer, default `1`                                  |
| limit      | number | no       | Positive integer <= `20`, default `5`                          |
| keyword    | string | no       | Search keyword                                                 |
| pet_type   | string | no       | Comma-separated pet type names                                 |
| rating     | number | no       | Integer between `1` and `5`                                    |
| experience | string | no       | Range format (for example `1-3`, `5-`)                         |
| lat        | number | no       | Latitude for location search                                   |
| lon        | number | no       | Longitude for location search                                  |
| radius     | number | no       | Search radius (meters); optional when `lat`/`lon` are provided |

**Success (200)**

```json
{
  "totalPetSitters": 100,
  "totalPages": 20,
  "currentPage": 1,
  "limit": 5,
  "sitters": [
    {
      "id": 1,
      "sitter": { "name": "string", "profileImgUrl": "string | null" },
      "imgUrl": "string | null",
      "tradeName": "string",
      "rating": 4.8,
      "petTypes": ["Dog", "Cat"],
      "latitude": 13.75,
      "longitude": 100.5,
      "province": "Bangkok",
      "district": "Pathum Wan"
    }
  ]
}
```

When `lat` and `lon` are provided, response also includes:

```json
{
  "meta": {
    "radiusUsed": 10000,
    "hasMore": true
  }
}
```

**Validation errors (400)**

- `"Page and limit must be positive integers"`
- `"Limit must be less than or equal to 20"`
- `"Pet type must be a comma separated list of pet types"`
- `"Rating must be an integer between 1 and 5"`
- `"Experience must be a range of integers"`

**Other errors**

- `500` - `"Internal server error"`

---

### GET /api/pet-sitter/:sitterId

Get sitter public profile by sitter id.

**Path params**

| Field    | Type   | Required | Constraints      |
| -------- | ------ | -------- | ---------------- |
| sitterId | number | yes      | Positive integer |

**Success (200)**

Returns sitter profile detail including `sitter`, `imgUrls`, `tradeName`, `experience`, `rating`, service content, and location fields.

**Errors**

- `400` - `"Sitter ID must be a positive integer"`
- `404` - `"Sitter not found"`
- `500` - `"Internal server error"`

---

### GET /api/pet-sitter/:sitterId/reviews

Get paginated reviews for a sitter.

**Path params**

| Field    | Type   | Required | Constraints      |
| -------- | ------ | -------- | ---------------- |
| sitterId | number | yes      | Positive integer |

**Query params**

| Field  | Type   | Required | Constraints                           |
| ------ | ------ | -------- | ------------------------------------- |
| page   | number | no       | Positive integer, default `1`         |
| limit  | number | no       | Positive integer <= `20`, default `5` |
| rating | number | no       | Integer between `1` and `5`           |

**Success (200)**

```json
{
  "totalReviews": 12,
  "totalPages": 3,
  "currentPage": 1,
  "limit": 5,
  "reviews": [
    {
      "id": 1,
      "rating": 5,
      "comment": "Great service",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "reviewer": {
        "id": "uuid",
        "name": "string",
        "profileImgUrl": "string | null"
      }
    }
  ]
}
```

**Validation errors (400)**

- `"Sitter ID must be a positive integer"`
- `"Page and limit must be positive integers"`
- `"Limit must be less than or equal to 20"`
- `"Rating must be an integer between 1 and 5"`

**Other errors**

- `404` - `"Sitter not found"`
- `500` - `"Internal server error"`

---

### GET /api/pet-sitter/profile

Get sitter profile of currently authenticated sitter.

**Auth**

- `Authorization: Bearer <accessToken>`
- Sitter role only

**Success (200)**

Returns sitter profile detail with additional fields such as `hasPendingUpdate`, `status`, and `adminNote`.

**Errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have pet sitter access"`
- `404` - `"Sitter not found for this user"`
- `500` - `"Internal server error"`

---

### PUT /api/pet-sitter/profile

Submit profile updates for sitter (stored as pending update flow).

**Auth**

- `Authorization: Bearer <accessToken>`
- Sitter role only

**Content-Type**

- `multipart/form-data`

**Form-data fields**

- `profileImage` (file, optional; `.png`, `.jpg`, `.jpeg`)
- `images` (files[], optional; `.png`, `.jpg`, `.jpeg`; up to 10 gallery images total with existing images)
- `body` (stringified JSON, required)

`body` JSON fields:

| Field            | Type                               | Group  | Required | Constraints                       |
| ---------------- | ---------------------------------- | ------ | -------- | --------------------------------- |
| name             | string                             | user   | no       | 2-100 chars, valid name format    |
| phone            | string                             | user   | no       | Valid Thai phone format           |
| idNumber         | string \| null                     | user   | no       | Valid ID format and checksum      |
| dateOfBirth      | string \| null                     | user   | no       | Valid date in the past            |
| removeProfileImg | boolean                            | user   | no       | Must be boolean                   |
| experience       | number \| null                     | sitter | no       | 0 <= value < 100, max 1 decimal   |
| tradeName        | string \| null                     | sitter | no       | 5-50 chars                        |
| petTypeIds       | number[] \| null                   | sitter | no       | At least 1 element if provided    |
| introduction     | string \| null                     | sitter | no       | 10-500 chars                      |
| services         | string \| null                     | sitter | no       | 10-1000 chars                     |
| description      | string \| null                     | sitter | no       | 10-500 chars                      |
| address          | string \| null                     | sitter | no       | 10-100 chars                      |
| latitude         | number \| null                     | sitter | no       | Between -90 and 90                |
| longitude        | number \| null                     | sitter | no       | Between -180 and 180              |
| provinceId       | number \| null                     | sitter | no       | Integer between 10 and 96         |
| districtId       | number \| null                     | sitter | no       | Integer between 1001 and 9699     |
| subDistrictId    | number \| null                     | sitter | no       | Integer between 100101 and 969999 |
| existingImages   | `{ url: string, order: number }[]` | sitter | no       | URLs and orders must be unique    |

**Success (200)**

```json
{
  "message": "Updated successfully"
}
```

**Validation/upload errors (400)**

- `"Body is required"` / `"Invalid JSON body"` / `"No fields to update"`
- User and sitter field validation errors from middlewares
- Upload validation errors from multer

**Other errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have pet sitter access"`
- `404` - Errors such as `"Sitter not found"` / `"Pet type not found"`
- `500` - `"Internal server error"`

---

### DELETE /api/pet-sitter/profile/cancel

Cancel pending sitter profile update.

**Auth**

- `Authorization: Bearer <accessToken>`
- Sitter role only

**Success (200)**

```json
{
  "message": "Cancelled successfully"
}
```

**Errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have pet sitter access"`
- `404` - `"Sitter not found for this pending update"` or `"Sitter not found"`
- `500` - `"Internal server error"`

---

### DELETE /api/pet-sitter/note

Clear sitter admin review note.

**Auth**

- `Authorization: Bearer <accessToken>`
- Sitter role only

**Success (200)**

```json
{
  "message": "Deleted Admin Review successfully"
}
```

**Errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have pet sitter access"`
- `404` - `"Sitter not found"`
- `500` - `"Internal server error"`

---

### GET /api/pet-sitter/bookings

Get sitter booking list (paginated).

**Auth**

- `Authorization: Bearer <accessToken>`
- Sitter role only

**Query params**

| Field   | Type   | Required | Notes                                                                                 |
| ------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| keyword | string | no       | Search owner/contact text                                                             |
| page    | number | no       | Positive integer, default `1`                                                         |
| limit   | number | no       | Positive integer, default `10`, max `20`                                              |
| status  | string | no       | `waiting_confirm`, `waiting_service`, `in_service`, `completed`, `canceled`, or `all` |

**Success (200)**

Returns paginated data with `totalPages`, `currentPage`, `limit`, `total`, and `bookings`.

**Errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have pet sitter access"`
- `500` - `"Internal server error"`

---

### GET /api/pet-sitter/bookings/available-hours/:sitterId

Get available 30-minute time slots for a sitter on a specific date.

**Path params**

| Field    | Type   | Required | Constraints      |
| -------- | ------ | -------- | ---------------- |
| sitterId | number | yes      | Positive integer |

**Query params**

| Field             | Type   | Required | Constraints                             |
| ----------------- | ------ | -------- | --------------------------------------- |
| date              | string | yes      | Valid date (`YYYY-MM-DD`)               |
| exceptedBookingId | number | no       | Positive integer (booking id to ignore) |

**Success (200)**

```json
{
  "availableSlots": ["00:00", "00:30", "01:00", "01:30"]
}
```

`availableSlots` is an array of available time slots in `HH:mm` format.

**Validation errors (400)**

- `"Sitter ID must be a positive integer"`
- `"Date is required"`
- `"Invalid date"`
- `"Excepted Booking ID must be a positive integer"`

**Other errors**

- `404` - `"Sitter not found"`
- `500` - `"Internal server error"`

---

### GET /api/pet-sitter/bookings/range

Get sitter bookings filtered by date range.

**Auth**

- `Authorization: Bearer <accessToken>`
- Sitter role only

**Query params**

| Field | Type   | Required | Constraints                                  |
| ----- | ------ | -------- | -------------------------------------------- |
| start | string | yes      | Valid date (`YYYY-MM-DD`)                    |
| end   | string | yes      | Valid date (`YYYY-MM-DD`) and `end >= start` |

**Success (200)**

```json
{
  "bookings": [
    {
      "id": 1,
      "ownerName": "string",
      "startTime": "2026-01-01T03:00:00.000Z",
      "endTime": "2026-01-01T05:00:00.000Z",
      "status": "waiting_confirm"
    }
  ]
}
```

**Validation errors (400)**

- `"Start Date is required"`
- `"End Date is required"`
- `"Invalid start date"` / `"Invalid end date"`
- `"Start date must be before end date"`

**Other errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have pet sitter access"`
- `500` - `"Internal server error"`

---

### GET /api/pet-sitter/bookings/:bookingId

Get booking detail by id for sitter.

**Auth**

- `Authorization: Bearer <accessToken>`
- Sitter role only

**Success (200)**

Returns booking detail payload.

**Errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have pet sitter access"`
- `404` - Booking not found / not accessible
- `500` - `"Internal server error"`

---

### PATCH /api/pet-sitter/booking/:bookingId/status

Update booking status by sitter.

**Auth**

- `Authorization: Bearer <accessToken>`
- Sitter role only

**Body (JSON)**

| Field  | Type   | Required | Notes              |
| ------ | ------ | -------- | ------------------ |
| status | string | yes      | New booking status |

**Success (200)**

```json
{
  "data": {}
}
```

**Errors**

- `400` - `"Status is required"`
- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have pet sitter access"`
- `4xx` - Business validation errors from booking service
- `500` - `"Internal server error"`

---

## Admin - `/api/admin`

All endpoints require admin authentication:

- `Authorization: Bearer <accessToken>`
- Admin role (`ProtectMiddleware.admin`)

If role is not admin:

- `403` - `"Forbidden: You do not have admin access"`

### GET /api/admin/pet-owner

Get paginated owner list for admin.

**Query params**

| Field   | Type   | Required | Notes                                 |
| ------- | ------ | -------- | ------------------------------------- |
| seed    | string | no       | Default is current date (`yyyyMMdd`)  |
| page    | number | no       | Positive integer, default `1`         |
| limit   | number | no       | Positive integer <= `20`, default `8` |
| keyword | string | no       | Search by owner information           |
| status  | string | no       | `Normal` or `Banned`                  |

**Success (200)**

```json
{
  "totalOwners": 100,
  "totalPages": 13,
  "currentPage": 1,
  "limit": 8,
  "owners": [
    {
      "id": "uuid",
      "name": "string",
      "phone": "string",
      "profileImgUrl": "string | null",
      "email": "string",
      "status": "Normal",
      "petCount": 2
    }
  ]
}
```

**Validation errors (400)**

- `"Invalid user status"`
- `"Page and limit must be positive integers"`
- `"Limit must be less than or equal to 20"`

**Other errors**

- `401` - Missing or invalid token
- `500` - `"Internal server error"`

---

### GET /api/admin/pet-owner/:userId

Get owner detail by `userId`.

**Path params**

| Field  | Type   | Required | Constraints |
| ------ | ------ | -------- | ----------- |
| userId | string | yes      | Valid UUID  |

**Success (200)**

```json
{
  "id": "uuid",
  "name": "string",
  "phone": "string",
  "profileImgUrl": "string | null",
  "idNumber": "string | null",
  "dateOfBirth": "string | null",
  "email": "string",
  "status": "Normal",
  "pets": [
    {
      "id": 1,
      "imgUrl": "string",
      "petName": "string",
      "petType": "string",
      "sex": "Male",
      "breed": "string",
      "dateOfBirth": "YYYY-MM-DD",
      "color": "string",
      "weight": "12.5",
      "about": "string | null"
    }
  ]
}
```

**Errors**

- `400` - `"Invalid user ID"`
- `401` - Missing or invalid token
- `404` - `"Owner not found"`
- `500` - `"Internal server error"`

---

### GET /api/admin/pet-sitter

Get paginated sitter list for admin management.

**Query params**

| Field            | Type   | Required | Notes                                                                  |
| ---------------- | ------ | -------- | ---------------------------------------------------------------------- |
| seed             | string | no       | Default is current date (`yyyyMMdd`)                                   |
| page             | number | no       | Positive integer, default `1`                                          |
| limit            | number | no       | Positive integer <= `20`, default `8`                                  |
| keyword          | string | no       | Search keyword                                                         |
| pet_type         | string | no       | Comma-separated pet types                                              |
| rating           | number | no       | Integer `1-5`                                                          |
| experience       | string | no       | Range format (for example `1-3`, `5-`)                                 |
| status           | string | no       | `Unapproved`, `Waiting for approval`, `Approved`, `Rejected`, `Banned` |
| hasPendingUpdate | string | no       | `true` / `false` / `1` / `0`                                           |

**Success (200)**

```json
{
  "totalSitters": 50,
  "totalPages": 7,
  "currentPage": 1,
  "limit": 8,
  "sitters": [
    {
      "id": 1,
      "sitter": {
        "name": "string",
        "profileImgUrl": "string | null",
        "email": "string",
        "status": "Normal"
      },
      "tradeName": "string",
      "hasPendingUpdate": false,
      "status": "Approved"
    }
  ]
}
```

**Validation errors (400)**

- `"Invalid sitter status"`
- `"Page and limit must be positive integers"`
- `"Limit must be less than or equal to 20"`
- `"Pet type must be a comma separated list of pet types"`
- `"Rating must be an integer between 1 and 5"`
- `"Experience must be a range of integers"`

**Other errors**

- `401` - Missing or invalid token
- `500` - `"Internal server error"`

---

### GET /api/admin/pet-sitter/pending-update/:sitterId

Get pending sitter profile update. Loads sitter pending data and **pending user profile** fields (`name`, `phone`, `profileImgUrl`, `idNumber`, `dateOfBirth`) from the user pending-update row.

**Path params**

| Field    | Type   | Required | Constraints      |
| -------- | ------ | -------- | ---------------- |
| sitterId | number | yes      | Positive integer |

**Success (200)**

```json
{
  "id": 1,
  "sitter": {
    "name": "string",
    "phone": "string",
    "profileImgUrl": "string | null",
    "idNumber": "string | null",
    "dateOfBirth": "string | null"
  },
  "imgUrls": [],
  "tradeName": "string",
  "experience": 1,
  "petTypes": ["Dog"],
  "introduction": "string",
  "services": "string",
  "description": "string",
  "address": "string",
  "latitude": 13.75,
  "longitude": 100.5,
  "province": "string",
  "district": "string",
  "subDistrict": "string",
  "postCode": "string"
}
```

**Errors**

- `400` - Invalid `sitterId`
- `401` - Missing or invalid token
- `404` - Sitter or pending sitter update not found, or `"User not found for this pending update"` when user pending data is missing
- `500` - `"Internal server error"`

---

### GET /api/admin/pet-sitter/bookings/:sitterId

Get paginated booking list for a sitter.

**Query params**

| Field | Type   | Required | Notes                                 |
| ----- | ------ | -------- | ------------------------------------- |
| page  | number | no       | Positive integer, default `1`         |
| limit | number | no       | Positive integer <= `20`, default `5` |

**Errors**

- `400` - Invalid `sitterId`
- `401` - Missing or invalid token
- `404` - Sitter not found
- `500` - `"Internal server error"`

---

### GET /api/admin/pet-sitter/booking/:bookingId

Get booking detail by booking id.

**Path params**

| Field     | Type   | Required | Constraints      |
| --------- | ------ | -------- | ---------------- |
| bookingId | number | yes      | Positive integer |

**Success (200)**

Returns booking detail and normalized `pets` array.

**Errors**

- `400` - `"Booking ID must be a positive integer"`
- `401` - Missing or invalid token
- `404` - Booking not found
- `500` - `"Internal server error"`

---

### GET /api/admin/pet-sitter/reviews/:sitterId

Get paginated reviews for a sitter (same shape as public sitter reviews list: `totalReviews`, `totalPages`, `currentPage`, `limit`, `reviews`).

**Query params**

| Field | Type   | Required | Notes                                 |
| ----- | ------ | -------- | ------------------------------------- |
| page  | number | no       | Positive integer, default `1`         |
| limit | number | no       | Positive integer <= `20`, default `5` |

**Errors**

- `400` - Invalid `sitterId`
- `401` - Missing or invalid token
- `404` - Sitter not found
- `500` - `"Internal server error"`

---

### GET /api/admin/pet-sitter/:sitterId

Get sitter detail (including `hasPendingUpdate`, `status`, and `adminNote`). Same general shape as sitter public profile plus admin fields.

**Errors**

- `400` - Invalid `sitterId`
- `401` - Missing or invalid token
- `404` - Sitter not found
- `500` - `"Internal server error"`

---

### PATCH /api/admin/pet-sitter/approve/:sitterId

Approve sitter pending update. Commits **pending user** profile fields (name, phone, image, ID, date of birth) from the user pending-update row first, then applies the sitter pending profile.

**Success (200)**

```json
{
  "message": "Update approved successfully"
}
```

**Errors**

- `400` - Invalid `sitterId`
- `401` - Missing or invalid token
- `404` - Sitter not found, sitter pending update not found, or user errors such as `"User not found for this pending update"` / `"User not found"`
- `500` - `"Internal server error"`

---

### PATCH /api/admin/pet-sitter/reject/:sitterId

Reject sitter pending update with admin note. Discards **pending user** profile changes first, then rejects the sitter pending update and persists `adminNote` on the sitter side.

**Body (JSON)**

| Field     | Type   | Required | Constraints  |
| --------- | ------ | -------- | ------------ |
| adminNote | string | yes      | 10-500 chars |

**Success (200)**

```json
{
  "message": "Update rejected successfully"
}
```

**Validation errors (400)**

- `"Body is required"`
- `"Admin note is required when rejecting a sitter"`
- `"Admin note must be a string"`
- `"Admin note must be at least 10 characters long"`
- `"Admin note must be less than 500 characters"`

**Other errors**

- `401` - Missing or invalid token
- `404` - Sitter not found, sitter pending update not found, or user errors such as `"User not found for this pending update"` / `"User not found"`
- `500` - `"Internal server error"`

---

### PATCH /api/admin/ban/:userId

Ban user (`owner` or `sitter`).

### PATCH /api/admin/unban/:userId

Unban user.

**Path params**

| Field  | Type   | Required | Constraints |
| ------ | ------ | -------- | ----------- |
| userId | string | yes      | Valid UUID  |

**Success (200)**

- Ban: `{ "message": "User banned successfully" }`
- Unban: `{ "message": "User unbanned successfully" }`

**Errors**

- `400` - `"Invalid user ID"`
- `401` - Missing or invalid token
- `404` - User/sitter not found
- `500` - `"Internal server error"`

---

### GET /api/admin/reports

Get paginated report list.

**Query params**

| Field  | Type   | Required | Notes                                                  |
| ------ | ------ | -------- | ------------------------------------------------------ |
| page   | number | no       | Positive integer, default `1`                          |
| limit  | number | no       | Positive integer, default `10`, max `20`               |
| status | string | no       | `all`, `new_report`, `pending`, `resolved`, `canceled` |

**Success (200)**

Returns report pagination payload from `ReportService.getAllReports`.

**Errors**

- `401` - Missing or invalid token
- `4xx` - Service-level validation errors
- `500` - `"Internal server error"`

---

### GET /api/admin/reports/:reportId

Get report detail by report id. If report is `"New Report"`, API auto-updates status to `"Pending"` before returning detail.

### PATCH /api/admin/reports/:reportId/status

Update report status.

**Body (JSON)**

| Field  | Type   | Required | Values                                                        |
| ------ | ------ | -------- | ------------------------------------------------------------- |
| status | string | yes      | `"New Report"` \| `"Pending"` \| `"Resolved"` \| `"Canceled"` |

**Errors (both endpoints)**

- `401` - Missing or invalid token
- `404` - Report not found
- `500` - `"Internal server error"`

---

## Address - `/api/address`

Address lookup endpoints for province, district, and sub-district.

**Auth**

Not required.

### GET /api/address/provinces

Get all provinces.

**Success (200)**

```json
[
  { "provinceId": 10, "name": "Bangkok" },
  { "provinceId": 11, "name": "Samut Prakarn" },
  { "provinceId": 12, "name": "Nonthaburi" },
  { "provinceId": 13, "name": "Pathum Thani" },
  { "provinceId": 14, "name": "Phra Nakhon Si Ayutthaya" }
]
```

**Errors**

- `500` - `"Internal server error"`

---

### GET /api/address/provinces/:provinceId/districts

Get districts by province id.

**Path params**

| Field      | Type   | Required | Constraints                            |
| ---------- | ------ | -------- | -------------------------------------- |
| provinceId | number | yes      | Positive integer between `10` and `96` |

**Success (200)**

```json
[
  { "districtId": 1001, "provinceId": 10, "name": "Phra Nakhon" },
  { "districtId": 1002, "provinceId": 10, "name": "Dusit" },
  { "districtId": 1003, "provinceId": 10, "name": "Nong Chok" },
  { "districtId": 1004, "provinceId": 10, "name": "Bang Rak" },
  { "districtId": 1005, "provinceId": 10, "name": "Bang Khen" }
]
```

**Validation errors (400)**

- `"Province ID must be a positive integer"`
- `"Province ID must be between 10 and 96"`

**Other errors**

- `404` - `"Province not found"`
- `500` - `"Internal server error"`

---

### GET /api/address/districts/:districtId/sub-districts

Get sub-districts by district id.

**Path params**

| Field      | Type   | Required | Constraints                                |
| ---------- | ------ | -------- | ------------------------------------------ |
| districtId | number | yes      | Positive integer between `1001` and `9699` |

**Success (200)**

```json
[
  {
    "subDistrictId": 100101,
    "districtId": 1001,
    "name": "Phra Borom Maha Ratchawang",
    "postCode": "10200"
  },
  {
    "subDistrictId": 100102,
    "districtId": 1001,
    "name": "Wang Burapha Phirom",
    "postCode": "10200"
  },
  {
    "subDistrictId": 100103,
    "districtId": 1001,
    "name": "Wat Ratchabophit",
    "postCode": "10200"
  }
]
```

**Validation errors (400)**

- `"District ID must be a positive integer"`
- `"District ID must be between 1001 and 9699"`

**Other errors**

- `404` - `"District not found"`
- `500` - `"Internal server error"`

---

## Booking - `/api/bookings`

All endpoints require owner authentication:

- `Authorization: Bearer <accessToken>`
- Owner role (`ProtectMiddleware.owner`)

If role is not owner:

- `403` - `"Forbidden: You do not have pet owner access"`

### GET /api/bookings/owner/history

Get booking history for authenticated owner.

**Success (200)**

Returns owner booking history payload from `BookingService.getOwnerBookingHistory`.

**Errors**

- `401` - Missing or invalid token
- `404` - User not found
- `500` - `"Internal server error"`

---

### PATCH /api/bookings/:bookingId/time

Update booking start/end time.

**Path params**

| Field     | Type   | Required | Constraints     |
| --------- | ------ | -------- | --------------- |
| bookingId | number | yes      | Must be numeric |

**Body (JSON)**

| Field     | Type   | Required | Notes                                            |
| --------- | ------ | -------- | ------------------------------------------------ |
| startTime | string | yes      | Valid datetime string                            |
| endTime   | string | yes      | Valid datetime string, must be after `startTime` |

**Success (200)**

Returns updated booking object.

**Validation errors (400)**

- `"Invalid bookingId"`
- `"startTime and endTime are required"`
- `"Invalid timestamp format"`
- `"endTime must be after startTime"`

**Other errors**

- `401` - Missing or invalid token
- `404` - `"Booking not found"`
- `500` - `"Internal server error"`

---

### POST /api/bookings

Create new booking.

**Body (JSON)**

| Field         | Type     | Required | Notes                          |
| ------------- | -------- | -------- | ------------------------------ |
| pet_sitter_id | number   | yes      | Target sitter id               |
| contact_name  | string   | yes      | Contact name                   |
| contact_email | string   | yes      | Contact email                  |
| contact_phone | string   | yes      | Contact phone                  |
| start_time    | string   | yes      | Booking start datetime         |
| end_time      | string   | yes      | Booking end datetime           |
| total_price   | number   | yes      | Total booking price            |
| note          | string   | no       | Additional note                |
| pet_ids       | number[] | no       | Owner pet ids for this booking |

**Success (201)**

Returns created booking payload from `BookingService.createBooking`.

**Validation errors (400)**

- `"Missing required fields"`

**Other errors**

- `401` - Missing or invalid token
- `403` - Owner role required
- `4xx` - Business validation errors from booking service
- `500` - `"Internal server error"`

---

## Payment - `/api/payment`

### POST /api/payment/create-intent

Create Stripe payment intent for card payment.

**Auth**

Not required by route middleware.

**Body (JSON)**

| Field     | Type   | Required | Notes                                                  |
| --------- | ------ | -------- | ------------------------------------------------------ |
| bookingId | number | yes      | Booking id                                             |
| amount    | number | yes      | Payment amount in THB (converted to satang internally) |

**Success (200)**

```json
{
  "clientSecret": "pi_12345_secret_abcde"
}
```

**Errors**

- `500` - `"Failed to create payment intent"`

---

### POST /api/payment/create-cash

Create pending cash transaction record.

**Auth**

Not required by route middleware.

**Body (JSON)**

| Field     | Type   | Required | Notes      |
| --------- | ------ | -------- | ---------- |
| bookingId | number | yes      | Booking id |

**Success (200)**

```json
{
  "transactionId": 201,
  "bookingId": 123,
  "paymentMethod": "cash",
  "status": "pending",
  "referenceNo": null
}
```

**Errors**

- `500` - `"Failed to create cash transaction"`

---

### GET /api/payment/payout-summary/:petSitterId

Get payout summary for sitter (paid transactions only).

**Auth**

- `Authorization: Bearer <accessToken>`
- Sitter role only

**Path params**

| Field       | Type   | Required | Constraints                  |
| ----------- | ------ | -------- | ---------------------------- |
| petSitterId | number | yes      | Numeric id of sitter profile |

**Success (200)**

```json
{
  "totalEarning": 3500,
  "transactions": [
    {
      "transactionId": 31,
      "paidAt": "2026-04-14T09:30:00.000Z",
      "amount": "1500",
      "ownerName": "John Doe"
    }
  ]
}
```

**Errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have pet sitter access"`
- `500` - `"Failed to get payout summary"`

---

## Review - `/api/reviews`

### POST /api/reviews

Create a review for a completed booking.

**Auth**

- `Authorization: Bearer <accessToken>`

**Body (JSON)**

| Field      | Type   | Required | Notes                |
| ---------- | ------ | -------- | -------------------- |
| booking_id | number | yes      | Booking id to review |
| rating     | number | yes      | Rating score         |
| comment    | string | yes      | Review comment       |

**Success (201)**

```json
{
  "message": "Review created successfully",
  "data": {
    "reviewId": 10,
    "bookingId": 123,
    "rating": 5,
    "comment": "Great sitter, very attentive",
    "createdAt": "2026-04-14T10:30:00.000Z"
  }
}
```

**Errors**

- `401` - `"Authorization header missing"` or `"Invalid authorization header"`
- `4xx` - Business validation errors from review service
- `500` - `"Internal Server Error"`

---

## Chat - `/api/chat`

### POST /api/chat/ask

Ask chatbot for sitter recommendations.

**Auth**

Optional. If token is provided, chatbot can use user context.

**Body (JSON)**

| Field | Type   | Required | Constraints                         |
| ----- | ------ | -------- | ----------------------------------- |
| query | string | yes      | At least 5 chars                    |
| topK  | number | no       | Positive integer <= 10, default `5` |

**Success (200)**

```json
{
  "query": "string",
  "introduction": "string",
  "petSitters": [
    {
      "sitterId": "12",
      "tradeName": "Happy Paws Care",
      "description": "Experienced sitter for dogs and cats"
    }
  ],
  "confidence": "High"
}
```

**Validation errors (400)**

- `"Body is required"`
- `"Query is required"`
- `"Query must be a string"`
- `"Query must be at least 5 characters long"`
- `"Top K must be a positive integer"`
- `"Top K must be less than or equal to 10"`

**Other errors**

- `4xx` - Chatbot business validation errors
- `500` - `"Internal server error"`

---

### POST /api/chat/conversations/find-or-create

Find existing conversation between owner and sitter, or create a new one.

**Auth**

- `Authorization: Bearer <accessToken>`
- Owner role only

**Body (JSON)**

| Field    | Type   | Required | Constraints      |
| -------- | ------ | -------- | ---------------- |
| sitterId | number | yes      | Positive integer |

**Success (200)**

Returns conversation object.

**Validation errors (400)**

- `"Body is required"`
- `"sitterId is required"`
- `"sitterId must be a positive integer"`

**Other errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have pet owner access"`
- `4xx` - Business errors from chat service
- `500` - `"Internal server error"`

---

### GET /api/chat/conversations

Get conversation list for authenticated user.

**Auth**

- `Authorization: Bearer <accessToken>`
- Owner or sitter role

**Success (200)**

```json
{
  "conversations": [
    {
      "conversationId": "8a4f29be-8575-4f0a-b862-716db94256fd",
      "name": "Happy Paws Care",
      "avatarUrl": "https://example.com/avatar.jpg",
      "lastMessage": "[Image]",
      "lastMessageAt": "2026-04-14T12:30:00.000Z",
      "unreadCount": 2
    }
  ]
}
```

**Errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have owner or pet sitter access"`
- `500` - `"Internal server error"`

---

### GET /api/chat/conversations/:conversationId

Get conversation detail by id (owner endpoint).

**Auth**

- `Authorization: Bearer <accessToken>`
- Owner role only

**Path params**

| Field          | Type   | Required | Constraints |
| -------------- | ------ | -------- | ----------- |
| conversationId | string | yes      | UUID format |

**Success (200)**

Returns conversation detail payload.

**Validation errors (400)**

- `"conversationId is required"`
- `"Invalid conversationId format"`

**Other errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have pet owner access"`
- `404` - Conversation not found
- `500` - `"Internal server error"`

---

### GET /api/chat/conversations/:conversationId/messages

Get paginated messages in a conversation.

**Auth**

- `Authorization: Bearer <accessToken>`
- Owner or sitter role

**Path params**

| Field          | Type   | Required | Constraints |
| -------------- | ------ | -------- | ----------- |
| conversationId | string | yes      | UUID format |

**Query params**

| Field  | Type   | Required | Constraints                           |
| ------ | ------ | -------- | ------------------------------------- |
| limit  | number | no       | Positive integer <= 100, default `30` |
| before | string | no       | Valid datetime string                 |

**Success (200)**

```json
{
  "conversationId": "uuid",
  "limit": 30,
  "before": null,
  "messages": [
    {
      "id": "5b8a1e97-c1a8-4a96-bf55-7c4b9baf60ae",
      "conversationId": "8a4f29be-8575-4f0a-b862-716db94256fd",
      "senderId": "f6a26ecb-8c57-4e9f-b83b-6d5f8d9dce50",
      "text": "Hello, are you available this weekend?",
      "messageType": "text",
      "imageUrl": null,
      "createdAt": "2026-04-14T12:00:00.000Z"
    }
  ],
  "pageInfo": {
    "hasMore": true,
    "nextBefore": "2026-04-14T12:00:00.000Z"
  }
}
```

**Validation errors (400)**

- `"conversationId is required"`
- `"Invalid conversationId format"`
- `"before must be a valid datetime"`
- `"limit must be a positive integer"`
- `"limit must be less than or equal to 100"`

**Other errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have owner or pet sitter access"`
- `404` - Conversation not found
- `500` - `"Internal server error"`

---

### POST /api/chat/conversations/:conversationId/images

Upload image as a chat message.

**Auth**

- `Authorization: Bearer <accessToken>`
- Owner or sitter role

**Content-Type**

- `multipart/form-data`

**Form-data fields**

| Field | Type | Required | Constraints             |
| ----- | ---- | -------- | ----------------------- |
| image | file | yes      | `.png`, `.jpg`, `.jpeg` |

**Success (201)**

```json
{
  "message": {
    "id": "4f95d4e6-ef8f-4e90-9a07-f03d66f7f9f4",
    "conversationId": "8a4f29be-8575-4f0a-b862-716db94256fd",
    "senderId": "f6a26ecb-8c57-4e9f-b83b-6d5f8d9dce50",
    "text": "",
    "messageType": "image",
    "imageUrl": "https://example.com/signed-chat-image-url",
    "createdAt": "2026-04-14T12:45:00.000Z"
  }
}
```

**Validation/upload errors (400)**

- `"conversationId is required"`
- `"Invalid conversationId format"`
- `"Image is required"`
- Upload validation errors from multer (for example `"Only .png .jpg .jpeg allowed"`)

**Other errors**

- `401` - Missing or invalid token
- `403` - `"Forbidden: You do not have owner or pet sitter access"`
- `404` - Conversation not found / no permission
- `500` - `"Internal server error"`

---

## Report - `/api/reports`

### POST /api/reports

Create a report for a booking issue.

**Auth**

- `Authorization: Bearer <accessToken>`

**Body (JSON)**

| Field       | Type   | Required | Notes                      |
| ----------- | ------ | -------- | -------------------------- |
| booking_id  | number | yes      | Booking id to report       |
| issue       | string | yes      | Short issue title/category |
| description | string | no       | Additional detail          |

**Success (201)**

```json
{
  "message": "Report created successfully",
  "data": {
    "reportId": 101,
    "reporterUserId": "f6a26ecb-8c57-4e9f-b83b-6d5f8d9dce50",
    "reportedUserId": "12bd6d36-a4c1-4a05-a03a-5f7f3f546f5c",
    "issue": "No-show",
    "description": "Sitter did not arrive at scheduled time",
    "status": "New Report",
    "createdAt": "2026-04-14T13:00:00.000Z",
    "updatedAt": "2026-04-14T13:00:00.000Z",
    "resolvedAt": null,
    "cancelledAt": null
  }
}
```

**Errors**

- `401` - `"Authorization header missing"` or `"Invalid authorization header"`
- `400` - `"booking_id and issue are required"`
- `403` - `"You cannot report this booking"`
- `404` - `"Booking not found"` or `"Pet sitter user not found"`
- `409` - `"This report has already been submitted"`
- `500` - `"Internal Server Error"`

---

## Webhook - `/api/webhook/stripe`

### POST /api/webhook/stripe

Stripe webhook endpoint for payment events.

**Auth**

No bearer token required.

**Important**

- Request must be raw JSON (`Content-Type: application/json`)
- Must include `stripe-signature` header
- Signature is verified with `STRIPE_WEBHOOK_SECRET`

**Handled event types**

- `payment_intent.succeeded`
  - Marks transaction as `paid`
  - Updates booking status to `"Waiting for service"`
- `payment_intent.payment_failed`
  - Marks transaction as `failed`
- Other event types are ignored (logged as unhandled)

**Success (200)**

```json
{
  "received": true
}
```

**Errors**

- `400` - `"Webhook Error"` (invalid/missing signature)
- `500` - `"Internal Server Error"` (handler failure)
