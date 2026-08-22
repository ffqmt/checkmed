import { describe, it, expect } from "vitest";
import { looksLikeEmissorMessage, stripEmissorBoundMessages } from "./emissor-message-filter";

describe("looksLikeEmissorMessage", () => {
  it("recognizes an exact 6-digit verification code", () => {
    expect(looksLikeEmissorMessage("482913")).toBe(true);
  });

  it("recognizes the default command words", () => {
    expect(looksLikeEmissorMessage("notas")).toBe(true);
    expect(looksLikeEmissorMessage("Notas")).toBe(true); // case-insensitive
    expect(looksLikeEmissorMessage("  menu  ")).toBe(true); // trims whitespace
  });

  it("recognizes 'status <numero>'", () => {
    expect(looksLikeEmissorMessage("status 123")).toBe(true);
    expect(looksLikeEmissorMessage("STATUS 42")).toBe(true);
  });

  // The case that matters most: a real MedCheck message must never be
  // silently dropped because it happens to resemble an emissor command.
  it("does NOT match ordinary MedCheck-style conversation text", () => {
    expect(looksLikeEmissorMessage("Bom dia, gostaria de saber o status do meu atestado")).toBe(false);
    expect(looksLikeEmissorMessage("Meu CID é F32.1")).toBe(false);
    expect(looksLikeEmissorMessage("Anexei o documento, obrigado")).toBe(false);
    expect(looksLikeEmissorMessage("")).toBe(false);
    expect(looksLikeEmissorMessage(undefined)).toBe(false);
  });

  it("does not match numbers with the wrong digit count (not a 6-digit code)", () => {
    expect(looksLikeEmissorMessage("12345")).toBe(false); // 5 digits
    expect(looksLikeEmissorMessage("1234567")).toBe(false); // 7 digits
    expect(looksLikeEmissorMessage("78700-300")).toBe(false); // CEP-shaped, has a dash
  });

  it("requires an exact match, not a substring — 'notas' embedded in a sentence must not match", () => {
    expect(looksLikeEmissorMessage("preciso de mais notas sobre meu caso")).toBe(false);
  });
});

describe("stripEmissorBoundMessages", () => {
  it("removes only messages that look emissor-bound, leaves the rest untouched", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "1311062692085198" },
                messages: [
                  { from: "5511999999999", type: "text", text: { body: "482913" } },
                  { from: "5511888888888", type: "text", text: { body: "Olá, preciso de ajuda com meu atestado" } },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = stripEmissorBoundMessages(payload);
    const remaining = result.entry?.[0]?.changes?.[0]?.value?.messages;

    expect(remaining).toHaveLength(1);
    expect(remaining?.[0]?.text?.body).toBe("Olá, preciso de ajuda com meu atestado");
  });

  it("leaves statuses (delivery receipts) untouched", () => {
    const payload = {
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.abc", status: "delivered" }] } }] }],
    };

    const result = stripEmissorBoundMessages(payload);
    expect(result.entry?.[0]?.changes?.[0]?.value?.statuses).toEqual([{ id: "wamid.abc", status: "delivered" }]);
  });

  it("passes through a change with no messages field unchanged", () => {
    const payload = { entry: [{ changes: [{ value: { metadata: { phone_number_id: "x" } } }] }] };
    const result = stripEmissorBoundMessages(payload);
    expect(result).toEqual(payload);
  });
});
