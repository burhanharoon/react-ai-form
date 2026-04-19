import { z } from "zod"

export const contactSchema = z.object({
  name: z.string().min(1).describe("Full name of the contact"),
  email: z.string().email().describe("Work email address"),
  company: z.string().min(1).describe("Company or organization name"),
  role: z.string().min(1).describe("Job title or role at the company, e.g. CTO, Product Manager"),
  message: z.string().min(10).describe("Short message about what they want to discuss"),
})
export type ContactInput = z.infer<typeof contactSchema>

export const productSchema = z.object({
  name: z.string().min(1).describe("Product name"),
  description: z.string().min(1).describe("Marketing description, 2-3 sentences, benefit-led"),
  category: z
    .enum(["electronics", "apparel", "home", "books", "other"])
    .describe("Product category"),
  price: z.number().min(0).describe("Price in USD"),
  tags: z.array(z.string()).describe("3-6 short lowercase tags for discoverability"),
})
export type ProductInput = z.infer<typeof productSchema>

export const applicationSchema = z.object({
  firstName: z.string().min(1).describe("First name"),
  lastName: z.string().min(1).describe("Last name"),
  email: z.string().email().describe("Contact email"),
  phone: z.string().describe("Contact phone number, any format"),
  company: z.string().min(1).describe("Most recent company"),
  role: z.string().min(1).describe("Most recent role / title"),
  yearsExperience: z.number().min(0).max(60).describe("Total years of professional experience"),
  bio: z.string().min(1).describe("Short professional bio, 2-3 sentences"),
  skills: z.array(z.string()).describe("Key technical skills, 3-8 lowercase items"),
})
export type ApplicationInput = z.infer<typeof applicationSchema>

export const SCHEMA_SIGNATURES = {
  contact: "name,email,company,role,message",
  product: "name,description,category,price,tags",
  application: "firstName,lastName,email,phone,company,role,yearsExperience,bio,skills",
} as const

export type SchemaKey = keyof typeof SCHEMA_SIGNATURES

export function detectSchemaKey(fieldNames: string[]): SchemaKey | null {
  const sig = fieldNames.slice().sort().join(",")
  for (const [key, value] of Object.entries(SCHEMA_SIGNATURES)) {
    const canonical = value.split(",").sort().join(",")
    if (canonical === sig) return key as SchemaKey
  }
  return null
}
