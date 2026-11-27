/*
guidValue = 8HEXDIG "-" 4HEXDIG "-" 4HEXDIG "-" 4HEXDIG "-" 12HEXDIG
    ; an approximation of a UUID (guid); HEXDIG accepts both cases.
*/

import { match } from "@beeff/loose-match";
import { all, charOneOf, Parser } from "@beeff/tuco";

// HEXDIG = "0"-"9" / "A"-"F" / "a"-"f"
const HEXDIG = charOneOf("0123456789abcdefABCDEF");

// exactly n HEXDIG joined into a string
const hexdig = function (n: number): Parser<string> {
  const parsers: Parser<string>[] = [];
  for (let i = 0; i < n; i++) parsers.push(HEXDIG);
  return all(...parsers).map(function (x: any) {
    return x.join("");
  });
};

// guidValue = 8HEXDIG "-" 4HEXDIG "-" 4HEXDIG "-" 4HEXDIG "-" 12HEXDIG
const guidValue = all(
  hexdig(8),
  "-",
  hexdig(4),
  "-",
  hexdig(4),
  "-",
  hexdig(4),
  "-",
  hexdig(12),
).map(function (v: any) {
  return v[0] + "-" + v[2] + "-" + v[4] + "-" + v[6] + "-" + v[8];
});

describe("guid", function () {
  it("parses a full guid", function () {
    const result = guidValue("12345678-1234-1234-1234-123456789012");

    match(result).with({
      value: "12345678-1234-1234-1234-123456789012",
      rest: "",
    });
  });

  it("parses lowercase hex", function () {
    const result = guidValue("abcdefab-cdef-cdef-cdef-abcdefabcdef");

    match(result).with({
      value: "abcdefab-cdef-cdef-cdef-abcdefabcdef",
      rest: "",
    });
  });

  it("leaves the rest unconsumed", function () {
    const result = guidValue("12345678-1234-1234-1234-123456789012xyz");

    match(result).with({
      value: "12345678-1234-1234-1234-123456789012",
      rest: "xyz",
    });
  });

  it("rejects a non-hex character", function () {
    const result = guidValue("1234567g-1234-1234-1234-123456789012");

    match(result).with({ failed: true, pos: 7 });
  });
});
