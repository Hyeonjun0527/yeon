import { describe, expect, it } from "vitest";

import {
  canManageActionTarget,
  isInlineEditableMemberActionTarget,
  type MemberFieldActionTarget,
} from "./member-field-edit-policy";

function createTarget(
  overrides: Partial<MemberFieldActionTarget>,
): MemberFieldActionTarget {
  return {
    field: {
      id: "field-1",
      name: "기본 필드",
      fieldType: "text",
      options: null,
      isRequired: false,
      displayOrder: 0,
      sourceKey: "member_name",
    },
    value: "값",
    valueFieldType: "text",
    valueScope: "member",
    memberPatchKey: "name",
    ...overrides,
  };
}

describe("member-field-edit-policy", () => {
  it("이름/이메일/전화번호 기본 필드만 인라인 편집 대상으로 본다", () => {
    expect(
      isInlineEditableMemberActionTarget(
        createTarget({ memberPatchKey: "name" }),
      ),
    ).toBe(true);
    expect(
      isInlineEditableMemberActionTarget(
        createTarget({ memberPatchKey: "email" }),
      ),
    ).toBe(true);
    expect(
      isInlineEditableMemberActionTarget(
        createTarget({ memberPatchKey: "phone" }),
      ),
    ).toBe(true);
    expect(
      isInlineEditableMemberActionTarget(
        createTarget({ memberPatchKey: "status" }),
      ),
    ).toBe(false);
    expect(
      isInlineEditableMemberActionTarget(
        createTarget({
          valueScope: "fieldValue",
          memberPatchKey: undefined,
          field: {
            id: "field-2",
            name: "기수",
            fieldType: "text",
            options: null,
            isRequired: false,
            displayOrder: 1,
            sourceKey: null,
          },
        }),
      ),
    ).toBe(false);
  });

  it("필드 관리 메뉴는 커스텀 필드 값에만 연다", () => {
    expect(canManageActionTarget(createTarget({ valueScope: "member" }))).toBe(
      false,
    );
    expect(
      canManageActionTarget(
        createTarget({
          valueScope: "fieldValue",
          memberPatchKey: undefined,
        }),
      ),
    ).toBe(true);
  });
});
