/*
binary      = "binary" SQUOTE binaryValue SQUOTE
binaryValue = *(4base64char) [ base64b16  / base64b8 ]
base64b16   = 2base64char ( 'A' / 'E' / 'I' / 'M' / 'Q' / 'U' / 'Y' / 'c' / 'g' / 'k' / 'o' / 's' / 'w' / '0' / '4' / '8' )   [ "=" ]
base64b8    = base64char ( 'A' / 'Q' / 'g' / 'w' ) [ "==" ]
base64char  = ALPHA / DIGIT / "-" / "_"
*/

import { match } from "@beeff/loose-match";
import { all, charOneOf, optional, or, rep0 } from "@beeff/tuco";

// base64char = ALPHA / DIGIT / "-" / "_"
const base64char = charOneOf(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
);

// 4base64char
const group4 = all(base64char, base64char, base64char, base64char).map(
  function (v: any) {
    return v.join("");
  },
);

// base64b16 = 2base64char ( 'A'/'E'/... ) [ "=" ]
const b16 = all(
  base64char,
  base64char,
  charOneOf("AEIMQUYcgkosw048"),
  optional("="),
).map(function (v: any) {
  return v[0] + v[1] + v[2] + (v[3] === null ? "" : "=");
});

// base64b8 = base64char ( 'A'/'Q'/'g'/'w' ) [ "==" ]
const b8 = all(base64char, charOneOf("AQgw"), optional("==")).map(function (
  v: any,
) {
  return v[0] + v[1] + (v[2] === null ? "" : "==");
});

// binaryValue = *(4base64char) [ base64b16 / base64b8 ]
const binaryValue = all(rep0(group4), optional(or(b16, b8))).map(function (
  v: any,
) {
  return v[0].join("") + (v[1] === null ? "" : v[1]);
});

// binary = "binary" SQUOTE binaryValue SQUOTE
const binary = all("binary", "'", binaryValue, "'").map(function (v: any) {
  return v[2];
});

describe("binary", function () {
  it("parses a single group", function () {
    const result = binary("binary'QUJD'");

    match(result).with({ value: "QUJD", rest: "" });
  });

  it("parses an empty value", function () {
    const result = binary("binary''");

    match(result).with({ value: "", rest: "" });
  });

  it("parses a group plus a b8 tail", function () {
    const result = binary("binary'QUJDRA'");

    match(result).with({ value: "QUJDRA", rest: "" });
  });

  it("parses a group plus a padded b16 tail", function () {
    const result = binary("binary'QUJDRG8='");

    match(result).with({ value: "QUJDRG8=", rest: "" });
  });

  it("parses a group plus an unpadded b16 tail", function () {
    const result = binary("binary'QUJDRG8'");

    match(result).with({ value: "QUJDRG8", rest: "" });
  });

  it("leaves the rest unconsumed", function () {
    const result = binary("binary'QUJD'rest");

    match(result).with({ value: "QUJD", rest: "rest" });
  });

  it("rejects a non-base64 character", function () {
    const result = binary("binary'QU!D'");

    match(result).with({ failed: true, pos: 9 });
  });
});
