// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 * @typedef {import("../generated/api").Target} Target
 * @typedef {import("../generated/api").ProductVariant & {minQuantity?: {value: string}, discountPercent?: {value: string}}} CustomProductVariant
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  /** @type {import("../generated/api").Discount[]} */
  const discounts = [];

  // Iterate over each cart line
  input.cart.lines.forEach((line) => {
    // Check if the merchandise is a ProductVariant
    if (line.merchandise.__typename === "ProductVariant") {
      const variant = line.merchandise;

      const minQuantityStr = variant.minQuantity?.value;
      const discountPercentStr = variant.discountPercent?.value;

      // Only proceed if both metafields exist
      if (minQuantityStr && discountPercentStr) {
        const minQuantity = parseInt(minQuantityStr, 10);
        const discountPercent = parseFloat(discountPercentStr);

        // Check if cart line quantity meets the minimum item threshold and discount > 0
        if (!isNaN(minQuantity) && !isNaN(discountPercent) && line.quantity >= minQuantity && discountPercent > 0) {
          discounts.push({
            targets: [
              {
                cartLine: {
                  id: line.id,
                },
              },
            ],
            value: {
              percentage: {
                value: discountPercent.toString()
              }
            }
          });
        }
      }
    }
  });

  if (discounts.length === 0) {
    return EMPTY_DISCOUNT;
  }

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.First,
    discounts: discounts,
  };
}