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
  discountApplicationStrategy: DiscountApplicationStrategy.Maximum,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  /** @type {import("../generated/api").Discount[]} */
  const discounts = [];
  /** @type {import("../generated/api").Target[]} */
  const upsellTargets = [];
  let upsellPercentValue = 0;
  let upsellMessageValue = "Product Upsell Discount";

  // Iterate over each cart line
  input.cart.lines.forEach((line) => {
    // Check if the merchandise is a ProductVariant
    if (line.merchandise.__typename === "ProductVariant") {
      const variant = line.merchandise;

      // 1. Check for Upsell attribute
      const upsellAttr = line.attribute?.value;
      if (upsellAttr) {
        let upsellPercent = 0;
        let upsellMsg = "Product Upsell Discount";

        try {
          const parsed = JSON.parse(upsellAttr);
          upsellPercent = parseFloat(parsed.percent);
          if (parsed.message) upsellMsg = parsed.message;
        } catch (e) {
          // Fallback for earlier plain-text numbers
          upsellPercent = parseFloat(upsellAttr);
        }

        if (!isNaN(upsellPercent) && upsellPercent > 0) {
          upsellTargets.push({
            cartLine: {
              id: line.id
            }
          });
          upsellPercentValue = upsellPercent;
          upsellMessageValue = upsellMsg;
        }
      }

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
                productVariant: {
                  id: variant.id,
                  quantity: line.quantity
                },
              },
            ],
            value: {
              percentage: {
                value: discountPercent.toString()
              }
            },
            message: "Discount"
          });
        }
      }
    }
  });

  if (upsellTargets.length > 0) {
    discounts.push({
      targets: upsellTargets,
      value: {
        percentage: {
          value: upsellPercentValue.toString()
        }
      },
      message: upsellMessageValue
    });
  }

  if (discounts.length === 0) {
    return EMPTY_DISCOUNT;
  }

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.Maximum,
    discounts: discounts,
  };
}