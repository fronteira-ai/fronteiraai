import { extractJsonArray } from "../sdk/parsing/jsonBlock";

describe("extractJsonArray", () => {
  it("extracts an array embedded inside a larger, non-JSON script blob", () => {
    const html = `<script>var app = new Vue({data(){return {"feature_product":[{"id":1,"name":"a"},{"id":2,"name":"b"}],"other":true}}})</script>`;
    expect(extractJsonArray(html, "feature_product")).toEqual([{ id: 1, name: "a" }, { id: 2, name: "b" }]);
  });

  it("does not stop early on a ']' inside a quoted string value", () => {
    const html = `{"feature_product":[{"name":"contains ] bracket"}],"other":[]}`;
    expect(extractJsonArray(html, "feature_product")).toEqual([{ name: "contains ] bracket" }]);
  });

  it("returns null when the key is not present", () => {
    expect(extractJsonArray("{}", "feature_product")).toBeNull();
  });

  it("returns null when the key's value is not an array", () => {
    expect(extractJsonArray(`{"feature_product":{"a":1}}`, "feature_product")).toBeNull();
  });

  it("returns null when the array is malformed JSON", () => {
    expect(extractJsonArray(`{"feature_product":[{,}]}`, "feature_product")).toBeNull();
  });
});
