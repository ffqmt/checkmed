import { describe, expect, it } from "vitest";
import { normalizePhoneNumber, phoneNumberVariants } from "./phone";

describe("normalizePhoneNumber", () => {
  it("strips everything but digits", () => {
    expect(normalizePhoneNumber("+55 (66) 99640-9434")).toBe("5566996409434");
  });
});

describe("phoneNumberVariants", () => {
  it("adds the 8-digit form for a 13-digit BR mobile number", () => {
    expect(phoneNumberVariants("+5566996409434")).toEqual(
      expect.arrayContaining(["5566996409434", "556696409434"]),
    );
  });

  it("adds the 9-digit form for a 12-digit BR number", () => {
    expect(phoneNumberVariants("556696409434")).toEqual(
      expect.arrayContaining(["556696409434", "5566996409434"]),
    );
  });

  it("real case: the outbound number and the reply's sender number cross-match", () => {
    const sentTo = phoneNumberVariants("+5566996409434");
    const [replyFrom] = phoneNumberVariants("556696409434");
    expect(sentTo).toContain(replyFrom);
  });

  it("leaves non-BR numbers untouched", () => {
    expect(phoneNumberVariants("+1 555-203-2674")).toEqual(["15552032674"]);
  });
});
