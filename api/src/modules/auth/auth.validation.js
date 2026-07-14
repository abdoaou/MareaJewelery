import { z } from 'zod'

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email()

export const registerSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string().min(8).max(128),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().max(30).optional(),
    role: z.enum(['CUSTOMER', 'ADMIN']).optional().default('CUSTOMER'),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string().min(1),
  }),
})

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
})

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailField,
  }),
})

export const resetPasswordSchema = z.object({
  body: z.object({
    email: emailField.optional(),
    token: z.string().min(6).max(64),
    password: z.string().min(8).max(128),
  }),
})

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  }),
})

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().max(30).optional(),
    avatar: z.string().url().optional(),
  }),
})

export const verifyEmailCodeSchema = z.object({
  body: z.object({
    email: emailField,
    code: z.string().min(6).max(6).regex(/^\d{6}$/),
  }),
})

export const resendVerificationSchema = z.object({
  body: z.object({
    email: emailField,
  }),
})
