import { z } from "zod";
import { objectId, paginationQuery } from "./common";

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    code: z.string().min(2).max(10),
    description: z.string().max(500).optional(),
    headDoctor: objectId.optional(),
    avgConsultationTime: z.number().min(1).optional().default(15),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateDepartmentSchema = z.object({
  body: createDepartmentSchema.shape.body.partial().extend({
    isActive: z.boolean().optional(),
  }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const getDepartmentByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const listDepartmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: paginationQuery.extend({
    isActive: z.coerce.boolean().optional(),
    search: z.string().optional(),
  }),
});
