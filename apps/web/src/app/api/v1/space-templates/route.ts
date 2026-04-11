import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  createTemplate,
  listTemplates,
  seedSystemTemplates,
} from "@/server/services/space-templates-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const templateFieldSchema = z.object({
  name: z.string().min(1).max(80),
  fieldType: z.enum([
    "text",
    "long_text",
    "number",
    "date",
    "select",
    "multi_select",
    "checkbox",
    "url",
    "email",
    "phone",
  ]),
  options: z
    .array(z.object({ value: z.string(), color: z.string() }))
    .nullish(),
  isRequired: z.boolean(),
  displayOrder: z.number().int(),
});

const templateTabSchema = z.object({
  name: z.string().min(1).max(80),
  tabType: z.enum(["system", "custom"]),
  systemKey: z.string().nullish(),
  displayOrder: z.number().int(),
  fields: z.array(templateFieldSchema),
});

const createTemplateBodySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullish(),
  tabsConfig: z.array(templateTabSchema),
});

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  try {
    // 시스템 템플릿이 없으면 seed
    await seedSystemTemplates();
    const templates = await listTemplates(currentUser.id);
    return NextResponse.json({ templates });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("템플릿 목록을 불러오지 못했습니다.", 500);
  }
}

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = createTemplateBodySchema.safeParse(body);
  if (!parsed.success)
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);

  try {
    const template = await createTemplate(currentUser.id, {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      tabsConfig: parsed.data.tabsConfig as Parameters<
        typeof createTemplate
      >[1]["tabsConfig"],
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError)
      return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("템플릿을 생성하지 못했습니다.", 500);
  }
}
