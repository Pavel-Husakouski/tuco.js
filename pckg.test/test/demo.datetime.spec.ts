/*
dateTimeOffsetValue = year "-" month "-" day "T" hour ":" minute [ ":" second [ "." fractionalSeconds ] ] ( "Z" / SIGN hour ":" minute )
    ; an approximation of the XML Schema dateTime lexical representation.
    ; every numeric part (year/month/day/hour/minute/second/fractionalSeconds) is 1*DIGIT.
*/

import { match } from "@beeff/loose-match";
import { all, charOneOf, optional, or, rep1 } from "@beeff/tuco";

// digit = "0"|"1"|"2"|...|"9"
const digit = charOneOf("0123456789");
// 1*DIGIT as a string
const digits = rep1(digit).map(function (x: any) {
  return x.join("");
});
// SIGN = "+" / "-"
const sign = or("+", "-");

// ( "Z" / SIGN hour ":" minute ) -> "Z" | { sign, hour, minute }
const offset = or(
  "Z",
  all(sign, digits, ":", digits).map(function (v: any) {
    return { sign: v[0], hour: v[1], minute: v[3] };
  }),
);

// ":" second [ "." fractionalSeconds ]
const secondsPart = all(":", digits, optional(all(".", digits))).map(function (
  v: any,
) {
  return {
    second: v[1],
    fractionalSeconds: v[2] === null ? null : v[2][1],
  };
});

// year "-" month "-" day "T" hour ":" minute [ secondsPart ] offset
const dateTimeOffsetValue = all(
  digits,
  "-",
  digits,
  "-",
  digits,
  "T",
  digits,
  ":",
  digits,
  optional(secondsPart),
  offset,
).map(function (v: any) {
  const s = v[9];
  return {
    year: v[0],
    month: v[2],
    day: v[4],
    hour: v[6],
    minute: v[8],
    second: s === null ? null : s.second,
    fractionalSeconds: s === null ? null : s.fractionalSeconds,
    offset: v[10],
  };
});

describe("datetime", function () {
  it("parses a full dateTime with Z and fractional seconds", function () {
    const result = dateTimeOffsetValue("2004-10-15T12:30:15.5Z");

    match(result).with({
      value: {
        year: "2004",
        month: "10",
        day: "15",
        hour: "12",
        minute: "30",
        second: "15",
        fractionalSeconds: "5",
        offset: "Z",
      },
      rest: "",
    });
  });

  it("parses an explicit offset", function () {
    const result = dateTimeOffsetValue("2004-10-15T12:30:15+05:00");

    match(result).with({
      value: {
        year: "2004",
        month: "10",
        day: "15",
        hour: "12",
        minute: "30",
        second: "15",
        fractionalSeconds: null,
        offset: { sign: "+", hour: "05", minute: "00" },
      },
      rest: "",
    });
  });

  it("parses a dateTime without seconds", function () {
    const result = dateTimeOffsetValue("2004-10-15T12:30Z");

    match(result).with({
      value: {
        year: "2004",
        month: "10",
        day: "15",
        hour: "12",
        minute: "30",
        second: null,
        fractionalSeconds: null,
        offset: "Z",
      },
      rest: "",
    });
  });

  it("parses a negative offset", function () {
    const result = dateTimeOffsetValue("2004-10-15T12:30:15-08:45");

    match(result).with({
      value: {
        year: "2004",
        month: "10",
        day: "15",
        hour: "12",
        minute: "30",
        second: "15",
        fractionalSeconds: null,
        offset: { sign: "-", hour: "08", minute: "45" },
      },
      rest: "",
    });
  });

  it("parses fractional seconds with an offset", function () {
    const result = dateTimeOffsetValue("2004-10-15T12:30:15.5+05:00");

    match(result).with({
      value: {
        year: "2004",
        month: "10",
        day: "15",
        hour: "12",
        minute: "30",
        second: "15",
        fractionalSeconds: "5",
        offset: { sign: "+", hour: "05", minute: "00" },
      },
      rest: "",
    });
  });

  it("leaves the rest unconsumed", function () {
    const result = dateTimeOffsetValue("2004-10-15T12:30Zrest");

    match(result).with({
      value: {
        year: "2004",
        month: "10",
        day: "15",
        hour: "12",
        minute: "30",
        second: null,
        fractionalSeconds: null,
        offset: "Z",
      },
      rest: "rest",
    });
  });

  it("rejects a dateTime without a timezone", function () {
    const result = dateTimeOffsetValue("2004-10-15T12:30:15");

    match(result).with({ failed: true, pos: 19 });
  });
});
