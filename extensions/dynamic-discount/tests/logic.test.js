import { describe, test, expect } from "vitest";
import { run } from "../src/run.js";

describe("Vanilla JS dynamic-discount functionality", () => {
  test("returns empty discount when metafields are missing", () => {
    const input = {
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            quantity: 5,
            merchandise: {
              __typename: "ProductVariant",
              id: "gid://shopify/ProductVariant/1",
            }
          }
        ]
      }
    };
    const result = run(input);
    expect(result.discounts.length).toBe(0);
  });

  test("returns empty discount when quantity is less than min_item", () => {
    const input = {
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            quantity: 2,
            merchandise: {
              __typename: "ProductVariant",
              id: "gid://shopify/ProductVariant/1",
              minQuantity: { value: "3" },
              discountPercent: { value: "15" }
            }
          }
        ]
      }
    };
    const result = run(input);
    expect(result.discounts.length).toBe(0);
  });

  test("applies correct discount percentage when quantity meets min_item", () => {
    const input = {
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            quantity: 5,
            merchandise: {
              __typename: "ProductVariant",
              id: "gid://shopify/ProductVariant/1",
              minQuantity: { value: "3" },
              discountPercent: { value: "15" }
            }
          }
        ]
      }
    };
    const result = run(input);
    expect(result.discounts.length).toBe(1);
    expect(result.discounts[0].targets[0].productVariant.id).toBe("gid://shopify/ProductVariant/1");
    expect(result.discounts[0].value.percentage.value).toBe("15");
  });
});
