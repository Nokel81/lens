import { toCamelCase } from "../camelCase";

describe("toCamelCase tests", () => {
  test("empty array", () => {
    expect(toCamelCase([])).toStrictEqual([]);
  });

  test("a string in an array", () => {
    expect(toCamelCase(["hello"])).toStrictEqual(["hello"]);
  });

  test("multiple strings in an array", () => {
    expect(toCamelCase(["hello", "world", "foo-bar", "foo_bar", "FooBar"]))
      .toStrictEqual(["hello", "world", "fooBar", "fooBar", "fooBar"]);
  });

  test("a string", () => {
    expect(toCamelCase("foo_bar"))
      .toStrictEqual("fooBar");
  });

  test("an object", () => {
    expect(toCamelCase({ foo_bar: 15 }))
      .toStrictEqual({ "fooBar": 15 });
  });

  test("an object, with multiple keys", () => {
    expect(toCamelCase({ foo1_bar: 15, "sdfhk-asd": true }))
      .toStrictEqual({ "foo1Bar": 15, "sdfhkAsd": true });
  });

  test("an object, with multiple keys and deep object", () => {
    expect(toCamelCase({ foo1_bar: 15, "sdfhk-asd": { "ILL": BigInt(456) } }))
      .toStrictEqual({ "foo1Bar": 15, "sdfhkAsd": { "ill": BigInt(456) } });
  });

  test("multiple objects in an array", () => {
    expect(toCamelCase([{ foo1_bar: 15, "sdfhk-asd": { "ILL": BigInt(456) } }, { "456": 45 }]))
      .toStrictEqual([{ "foo1Bar": 15, "sdfhkAsd": { "ill": BigInt(456) } }, { "456": 45 }]);
  });
});
