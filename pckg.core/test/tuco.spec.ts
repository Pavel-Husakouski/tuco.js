import { instanceOf, match, re } from "@beeff/loose-match";
import {
  all,
  anyChar,
  between,
  charExcept,
  charIs,
  charMeets,
  charOneOf,
  first,
  optional,
  or,
  rep0,
  rep1,
  second,
  word,
} from "../src/index.js";

// Returns the error thrown by fn, or null when it does not throw.
function thrown(fn: Function) {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
}

describe("map", function () {
  it("map not null", function () {
    const parser = all(word("first"), word("second"), word("third")).map(
      function (values) {
        return values.join(".");
      },
    );
    const result = parser("firstsecondthirdrest");

    match(result).with({ value: "first.second.third", rest: "rest" });
  });

  it("map null", function () {
    const parser = all(word("first"), word("second"), word("third")).map(
      function (values) {
        return values.join(".");
      },
    );
    const result = parser("zerofirstsecondthird");

    match(result).with({ failed: true });
  });
});

describe("alternation", function () {
  it("or implicit `word`", function () {
    const parser = or("first", "second", "third");
    const result = parser("firstsecondthird");

    match(result).with({ value: "first", rest: "secondthird" });
  });

  it("or first not null", function () {
    const parser = or(word("first"), word("second"), word("third"));
    const result = parser("firstsecondthird");

    match(result).with({ value: "first", rest: "secondthird" });
  });

  it("or second not null", function () {
    const parser = or(word("first"), word("second"), word("third"));
    const result = parser("secondfirstthird");

    match(result).with({ value: "second", rest: "firstthird" });
  });

  it("or third not null", function () {
    const parser = or(word("first"), word("second"), word("third"));
    const result = parser("thirdfirstsecond");

    match(result).with({ value: "third", rest: "firstsecond" });
  });

  it("or all null", function () {
    const parser = or(word("first"), word("second"), word("third"));
    const result = parser("fourththirdfirstsecond");

    match(result).with({ failed: true });
  });
});

describe("repetition", function () {
  it("rep1 not null", function () {
    const parser = rep1(charIs("x"));
    const result = parser("xxxxzzzz");

    match(result).with({ value: ["x", "x", "x", "x"], rest: "zzzz" });
  });

  it("rep1 null", function () {
    const parser = rep1(charIs("x"));
    const result = parser("");

    match(result).with({ failed: true });
  });

  it("rep1 single not null", function () {
    const parser = rep1(charIs("x"));
    const result = parser("xy");

    match(result).with({ value: ["x"], rest: "y" });
  });

  it("rep0 not null", function () {
    const parser = rep0(charIs("x"));
    const result = parser("xxxxzzzz");

    match(result).with({ value: ["x", "x", "x", "x"], rest: "zzzz" });
  });

  it("rep0 empty when no match", function () {
    const parser = rep0(charIs("x"));
    const result = parser("zzz");

    match(result).with({ value: [], rest: "zzz" });
  });

  it("rep0 single not null", function () {
    const parser = rep1(charIs("x"));
    const result = parser("xzzz");

    match(result).with({ value: ["x"], rest: "zzz" });
  });

  it("rep1 implicit `all` result null when no match", function () {
    const parser = rep1(word("text"), word("text"));
    const result = parser("text and etc.");

    match(result).with({ failed: true });
  });

  it("rep1 implicit `all` value not null when match", function () {
    const parser = rep1(word("text1"), word("text2"));
    const result = parser("text1text2text1text2text1 and etc.");

    match(result).with({
      value: [
        ["text1", "text2"],
        ["text1", "text2"],
      ],
      rest: "text1 and etc.",
    });
  });

  it("rep0 implicit `all` value empty when no match", function () {
    const parser = rep0(word("text1"), word("text2"));
    const result = parser("text1text and etc.");

    match(result).with({
      value: [],
      rest: "text1text and etc.",
    });
  });

  it("rep0 implicit `word` value empty when no match", function () {
    const parser = rep0("text1", "text2");
    const result = parser("text1text and etc.");

    match(result).with({
      value: [],
      rest: "text1text and etc.",
    });
  });

  it("rep0 implicit `all` value not null when match", function () {
    const parser = rep0(word("text1"), word("text2"));
    const result = parser("text1text2text1text2text1 and etc.");

    match(result).with({
      value: [
        ["text1", "text2"],
        ["text1", "text2"],
      ],
      rest: "text1 and etc.",
    });
  });

  it("rep0 implicit `word`", function () {
    const parser = rep0("text1", "text2");
    const result = parser("text1text2text1text2text1 and etc.");

    match(result).with({
      value: [
        ["text1", "text2"],
        ["text1", "text2"],
      ],
      rest: "text1 and etc.",
    });
  });

  it("rep1(anyChar()) parses long input without recursion", function () {
    const parser = rep1(anyChar());
    const result = parser("x".repeat(20000));

    match(result).with({ rest: "" });
  });

  it("rep1(optional(...)) throws on empty match", function () {
    const parser = rep1(optional("x"));
    const error = thrown(function () {
      parser("y");
    });

    match(error).with(instanceOf(Error, { message: re(/empty input/) }));
  });
});

describe("option", function () {
  it("optional implicit `word`", function () {
    const parser = optional("text");
    const result = parser("text and etc.");

    match(result).with({
      value: "text",
      rest: " and etc.",
    });
  });

  it("optional not null", function () {
    const parser = optional(word("text"));
    const result = parser("text and etc.");

    match(result).with({ value: "text", rest: " and etc." });
  });

  it("optional can't be null", function () {
    const parser = optional(word("text"));
    const result = parser("xxx text and etc.");

    match(result).with({ value: null, rest: "xxx text and etc." });
  });

  it("implicit `all` value null when no match", function () {
    const parser = optional(word("text"), word("text"));
    const result = parser("text and etc.");

    match(result).with({ value: null, rest: "text and etc." });
  });

  it("implicit `all` value not null when match", function () {
    const parser = optional(word("text"), word("text"));
    const result = parser("texttext and etc.");

    match(result).with({ value: ["text", "text"], rest: " and etc." });
  });
});

describe("charXXX", function () {
  it("charExcept not null", function () {
    const parser = charExcept("");
    const result = parser("x123");

    match(result).with({ value: "x", rest: "123" });
  });

  it("charExcept null", function () {
    const parser = charExcept("x");
    const result = parser("x123");

    match(result).with({ failed: true });
  });

  it("charOneOF not null", function () {
    const parser = charOneOf("xyz");
    const result = parser("x123");

    match(result).with({ value: "x", rest: "123" });
  });

  it("charOneOF null", function () {
    const parser = charOneOf("xyz");
    const result = parser("123");

    match(result).with({ failed: true });
  });

  it("charMeets not null", function () {
    const parser = charMeets(function (ch) {
      return ch === "x";
    });
    const result = parser("xyz");

    match(result).with({ value: "x", rest: "yz" });
  });

  it("charMeets null", function () {
    const parser = charMeets(function (ch) {
      return false;
    });
    const result = parser("xyz");

    match(result).with({ failed: true });
  });

  it('charIs("x") not null', function () {
    const parser = charIs("x");
    const result = parser("xyz");

    match(result).with({ value: "x", rest: "yz" });
  });

  it('charIs("x") null', function () {
    const parser = charIs("x");
    const result = parser("1yz");

    match(result).with({ failed: true });
  });
});

describe("all", function () {
  it("implicit `word`", function () {
    const parser = all("x", "yy", "x");
    const result = parser("xyyx and etc.");

    match(result).with({
      value: ["x", "yy", "x"],
      rest: " and etc.",
    });
  });

  it("word not null", function () {
    const parser = word("text");
    const result = parser("text and etc.");

    match(result).with({ value: "text", rest: " and etc." });
  });

  it("word not null", function () {
    const parser = word("test");
    const result = parser("test and etc.");

    match(result).with({
      value: "test",
      rest: " and etc.",
    });
  });

  it("word null", function () {
    const parser = word("text");
    const result = parser("zzztext and etc.");

    match(result).with({ failed: true });
  });

  it("between not null", function () {
    const parser = between(charIs("("), charOneOf("xyz"), charIs(")"));
    const result = parser("(x)xxx");

    match(result).with({ value: "x", rest: "xxx" });
  });

  it("between null", function () {
    const parser = between(charIs("("), charOneOf("xyz"), charIs(")"));
    const result = parser("(1)xxx");

    match(result).with({ failed: true });
  });

  it("between implicit `word`", function () {
    const parser = between("(", "xyz", ")");
    const result = parser("(xyz)xxx");

    match(result).with({
      value: "xyz",
      rest: "xxx",
    });
  });

  it("first not null when match", function () {
    const parser = first(charOneOf("xyz"), charIs("/"));
    const result = parser("x/rest");

    match(result).with({
      value: "x",
      rest: "rest",
    });
  });

  it("first is null when no match", function () {
    const parser = first(charOneOf("xyz"), charIs("/"));
    const result = parser("k\\rest");

    match(result).with({ failed: true });
  });

  it("second implicit `word`", function () {
    const parser = first("xyz", "/");
    const result = parser("xyz/rest");

    match(result).with({
      value: "xyz",
      rest: "rest",
    });
  });

  it("second not null when match", function () {
    const parser = second(charIs("\\"), charOneOf("xyz"));
    const result = parser("\\xxxx");

    match(result).with({ value: "x", rest: "xxx" });
  });

  it("second is null when no match", function () {
    const parser = second(charIs("\\"), charOneOf("xyz"));
    const result = parser("/xxxx");

    match(result).with({ failed: true });
  });

  it("second implicit `word`", function () {
    const parser = second("\\", "xyz");
    const result = parser("\\xyzxxx");

    match(result).with({
      value: "xyz",
      rest: "xxx",
    });
  });

  it("all not null when match", function () {
    const parser = all(charIs("x"), charIs("y"), charIs("z"), charIs("1"));
    const result = parser("xyz1rest");

    match(result).with({
      value: ["x", "y", "z", "1"],
      rest: "rest",
    });
  });

  it("all first null", function () {
    const parser = all(charIs("x"), charIs("y"), charIs("z"), charIs("1"));
    const result = parser("_yz1rest");

    match(result).with({ failed: true });
  });

  it("all second null", function () {
    const parser = all(charIs("x"), charIs("y"), charIs("z"), charIs("1"));
    const result = parser("x_z1rest");

    match(result).with({ failed: true });
  });

  it("all third null", function () {
    const parser = all(charIs("x"), charIs("y"), charIs("z"), charIs("1"));
    const result = parser("xy_1rest");

    match(result).with({ failed: true });
  });

  it("all fourth null", function () {
    const parser = all(charIs("x"), charIs("y"), charIs("z"), charIs("1"));
    const result = parser("xyz_rest");

    match(result).with({ failed: true });
  });

  it("all empty null", function () {
    const parser = all(charIs("x"), charIs("y"), charIs("z"), charIs("1"));
    const result = parser("");

    match(result).with({ failed: true });
  });
});

describe("anyChar", function () {
  it("value and rest are not when match", function () {
    const parser = anyChar();
    const result = parser("123");

    match(result).with({ value: "1", rest: "23" });
  });

  it("empty string should fail", function () {
    const parser = anyChar();
    const result = parser("");

    match(result).with({ failed: true });
  });

  it("null should fail", function () {
    const parser = anyChar();
    const result = parser(null);

    match(result).with({ failed: true });
  });
});

describe("null input", function () {
  it("optional succeeds with a null value", function () {
    const parser = optional("a");
    const result = parser(null);

    match(result).with({ value: null, rest: "" });
  });

  it("rep0 succeeds with an empty array", function () {
    const parser = rep0("a");
    const result = parser(null);

    match(result).with({ value: [], rest: "" });
  });

  it("word fails at position 0", function () {
    const parser = word("a");
    const result = parser(null);

    match(result).with({ failed: true, pos: 0 });
  });

  it("charIs fails with the expected character", function () {
    const parser = charIs("a");
    const result = parser(null);

    match(result).with({ failed: true, pos: 0, expected: ['"a"'] });
  });

  it("all fails cleanly", function () {
    const parser = all(charIs("a"), charIs("b"));
    const result = parser(null);

    match(result).with({ failed: true, pos: 0 });
  });

  it("or fails cleanly", function () {
    const parser = or(word("a"), word("b"));
    const result = parser(null);

    match(result).with({ failed: true, pos: 0 });
  });
});

describe("errors", function () {
  it("carries the position and expected", function () {
    const parser = word("abc");
    const result = parser("abx");

    match(result).with({ failed: true, pos: 2, expected: ['"c"'] });
  });

  it("or keeps the furthest failure and unions expectations", function () {
    const parser = or(word("ab"), word("ax"));
    const result = parser("az");

    match(result).with({ failed: true, pos: 1, expected: ['"b"', '"x"'] });
  });

  it("all propagates the first failure", function () {
    const parser = all(charIs("a"), charIs("b"));
    const result = parser("ax");

    match(result).with({ failed: true, pos: 1, expected: ['"b"'] });
  });

  it("charIs reports the expected character at end of input", function () {
    const parser = charIs(")");
    const result = parser("");

    match(result).with({ failed: true, pos: 0, expected: ['")"'] });
  });

  it("word reports the missing character at end of input", function () {
    const parser = word("abc");
    const result = parser("ab");

    match(result).with({ failed: true, pos: 2, expected: ['"c"'] });
  });
});

describe("argument validation", function () {
  it("word rejects an empty string at construction", function () {
    match(
      thrown(function () {
        word("");
      }),
    ).with(instanceOf(Error, { message: re(/non-empty string/) }));
  });

  it("rep1 requires at least one combinator", function () {
    match(
      thrown(function () {
        rep1();
      }),
    ).with(instanceOf(Error, { message: re(/at least one combinator/) }));
  });

  it("rep0 requires at least one combinator", function () {
    match(
      thrown(function () {
        rep0();
      }),
    ).with(instanceOf(Error, { message: re(/at least one combinator/) }));
  });

  it("optional requires at least one combinator", function () {
    match(
      thrown(function () {
        optional();
      }),
    ).with(instanceOf(Error, { message: re(/at least one combinator/) }));
  });

  it("all rejects no combinators", function () {
    match(
      thrown(function () {
        all();
      }),
    ).with(instanceOf(Error, { message: re(/at least two combinators/) }));
  });

  it("all rejects a single combinator", function () {
    match(
      thrown(function () {
        all(anyChar());
      }),
    ).with(instanceOf(Error, { message: re(/at least two combinators/) }));
  });

  it("or rejects a single combinator", function () {
    match(
      thrown(function () {
        or(anyChar());
      }),
    ).with(instanceOf(Error, { message: re(/at least two combinators/) }));
  });

  it("first rejects a single combinator", function () {
    match(
      thrown(function () {
        (first as any)(anyChar());
      }),
    ).with(instanceOf(Error, { message: re(/two combinators/) }));
  });

  it("second rejects a single combinator", function () {
    match(
      thrown(function () {
        (second as any)(anyChar());
      }),
    ).with(instanceOf(Error, { message: re(/two combinators/) }));
  });

  it("between rejects two combinators", function () {
    match(
      thrown(function () {
        (between as any)(anyChar(), anyChar());
      }),
    ).with(instanceOf(Error, { message: re(/three combinators/) }));
  });

  it("charExcept rejects a non-string", function () {
    match(
      thrown(function () {
        (charExcept as any)(1);
      }),
    ).with(instanceOf(Error, { message: re(/accepts string/) }));
  });

  it("charOneOf rejects null", function () {
    match(
      thrown(function () {
        (charOneOf as any)(null);
      }),
    ).with(instanceOf(Error, { message: re(/accepts string/) }));
  });

  it("charIs rejects a multi-character string", function () {
    match(
      thrown(function () {
        charIs("ab");
      }),
    ).with(instanceOf(Error, { message: re(/single character/) }));
  });

  it("charMeets rejects a non-function predicate", function () {
    match(
      thrown(function () {
        (charMeets as any)("not a fn");
      }),
    ).with(instanceOf(Error, { message: re(/accepts predicate/) }));
  });

  it("map rejects a non-function projection", function () {
    match(
      thrown(function () {
        (anyChar() as any).map("not a fn");
      }),
    ).with(instanceOf(Error, { message: re(/projection function/) }));
  });
});
