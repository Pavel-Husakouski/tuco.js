import { match } from "@beeff/loose-match";
import { all, optional, Parser } from "@beeff/tuco";

function toString(x: any) {
  if (x === null || typeof x === "string") return x;
  return x.join("");
}

describe("recursive", function () {
  it("S = '(', [S], ')', [S]", function () {
    const sImpl: Parser<any> = all(
      "(",
      optional(s).map(toString),
      ")",
      optional(s).map(toString),
    ).map(toString);

    function s(x: string | null) {
      return sImpl(x);
    }

    const inputs = [
      "()",
      "()()",
      "(())",
      "()()()()",
      "((())(()))(())()",
      "(((())(()))((())(())))",
      "()((((())(()))((())(())))(((())(()))((())(()))))",
    ];

    match(
      inputs.map(function (input) {
        return s(input);
      }),
    ).with(
      inputs.map(function (input) {
        return { value: input, rest: "" };
      }),
    );
  });
});
