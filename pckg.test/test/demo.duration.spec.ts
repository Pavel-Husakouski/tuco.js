/*
duration      = [ "duration" ] SQUOTE durationValue SQUOTE
durationValue = [ SIGN ] "P" [ 1*DIGIT "D" ] [ "T" [ 1*DIGIT "H" ] [ 1*DIGIT "M" ] [ 1*DIGIT [ "." 1*DIGIT ] "S" ] ]
    ; the above is an approximation of the rules for an xml dayTimeDuration.
    ; see the lexical representation for dayTimeDuration in http://www.w3.org/TR/xmlschema11-2#dayTimeDuration for more information
*/

import { match } from "@beeff/loose-match";
import {
  all,
  charOneOf,
  first,
  optional,
  or,
  rep1,
  second,
} from "@beeff/tuco";

// digit = "0"|"1"|"2"|...|"9"
const digit = charOneOf("0123456789");
// 1*DIGIT as a string
const digits = rep1(digit).map(function (x: any) {
  return x.join("");
});
// SIGN = "+" / "-"
const sign = or("+", "-");
// SQUOTE = "'"
const squote = "'";

// 1*DIGIT "D" -> days
const day = first(digits, "D");
// 1*DIGIT "H" -> hours
const hour = first(digits, "H");
// 1*DIGIT "M" -> minutes
const minute = first(digits, "M");
// 1*DIGIT [ "." 1*DIGIT ] "S" -> seconds ("5" or "5.5")
const seconds = all(digits, optional(all(".", digits)), "S").map(function (
  v: any,
) {
  return v[0] + (v[1] === null ? "" : "." + v[1][1]);
});

// "T" [ hour ] [ minute ] [ seconds ]
const time = second(
  "T",
  all(optional(hour), optional(minute), optional(seconds)),
);

// [ SIGN ] "P" [ day ] [ time ]
const durationValue = all(
  optional(sign),
  "P",
  optional(day),
  optional(time),
).map(function (v: any) {
  const t = v[3];
  return {
    sign: v[0],
    days: v[2],
    hours: t === null ? null : t[0],
    minutes: t === null ? null : t[1],
    seconds: t === null ? null : t[2],
  };
});

// [ "duration" ] SQUOTE durationValue SQUOTE
const duration = all(
  optional("duration"),
  squote,
  durationValue,
  squote,
).map(function (v: any) {
  return v[2];
});

describe("duration", function () {
  it("parses days only", function () {
    const result = duration("'P1D'");

    match(result).with({
      value: {
        sign: null,
        days: "1",
        hours: null,
        minutes: null,
        seconds: null,
      },
      rest: "",
    });
  });

  it("parses a negative dayTimeDuration with the keyword", function () {
    const result = duration("duration'-P2DT3H4M5.5S'");

    match(result).with({
      value: {
        sign: "-",
        days: "2",
        hours: "3",
        minutes: "4",
        seconds: "5.5",
      },
      rest: "",
    });
  });

  it("parses time only", function () {
    const result = duration("'PT2H'");

    match(result).with({
      value: {
        sign: null,
        days: null,
        hours: "2",
        minutes: null,
        seconds: null,
      },
      rest: "",
    });
  });

  it("parses fractional seconds", function () {
    const result = duration("'PT1.5S'");

    match(result).with({
      value: {
        sign: null,
        days: null,
        hours: null,
        minutes: null,
        seconds: "1.5",
      },
      rest: "",
    });
  });

  it("parses minutes and whole seconds", function () {
    const result = duration("'PT3M4S'");

    match(result).with({
      value: {
        sign: null,
        days: null,
        hours: null,
        minutes: "3",
        seconds: "4",
      },
      rest: "",
    });
  });

  it("parses a bare P with no components", function () {
    const result = duration("'P'");

    match(result).with({
      value: {
        sign: null,
        days: null,
        hours: null,
        minutes: null,
        seconds: null,
      },
      rest: "",
    });
  });

  it("leaves the rest unconsumed", function () {
    const result = duration("'P1D'zzz");

    match(result).with({
      value: {
        sign: null,
        days: "1",
        hours: null,
        minutes: null,
        seconds: null,
      },
      rest: "zzz",
    });
  });

  it("rejects a value without the leading P", function () {
    const result = duration("'1D'");

    match(result).with({ failed: true, pos: 1, expected: ['"P"'] });
  });
});
