import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    // 1. Fetch our function ID dynamically from the API instead of env variable
    const functionsResponse = await admin.graphql(
      `#graphql
      query {
        shopifyFunctions(first: 10) {
          edges {
            node {
              id
              apiType
              title
            }
          }
        }
      }`
    );
    const functionsData = await functionsResponse.json();
    const ourFunction = functionsData?.data?.shopifyFunctions?.edges?.find(
      (edge) => edge.node.apiType === "product_discounts"
    );
    
    const functionId = ourFunction?.node?.id;

    if (functionId) {
      // 2. Check if the discount already exists
      const response = await admin.graphql(
        `#graphql
        query {
          discountNodes(first: 10) {
            edges {
              node {
                id
                discount {
                  ... on DiscountAutomaticApp {
                    title
                  }
                }
              }
            }
          }
        }`
      );
      if (response.errors) console.error("Discount Exists Check Error:", response.errors);
      
      const data = await response.json();
      
      const discountExists = data?.data?.discountNodes?.edges?.some(
        (edge) => edge.node.discount?.title === "Dynamic Metafield Discount"
      );

      // 3. If it doesn't exist, create it automatically
      if (!discountExists) {
        const createResponse = await admin.graphql(
          `#graphql
          mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
            discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
              automaticAppDiscount {
                discountId
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              automaticAppDiscount: {
                title: "Dynamic Metafield Discount",
                functionId: functionId,
                startsAt: new Date().toISOString()
              }
            }
          }
        );
        const createData = await createResponse.json();
        
        if (createData.data?.discountAutomaticAppCreate?.userErrors?.length > 0) {
           console.error("Discount Creation User Errors:", createData.data.discountAutomaticAppCreate.userErrors);
        } else if (createResponse.errors) {
           console.error("Discount Creation GraphQL Errors:", createResponse.errors);
        } else {
           console.log("✅ Automatic discount created successfully");
        }
      }
    } else {
      console.log("⚠️ Could not find the product_discounts function installed on this store yet.");
    }
    
    // 4. Automatically create Metafield Definitions for Variants so they show up in the Shopify Admin
    // Definition for custom.min_item
    const minItemRes = await admin.graphql(
      `#graphql
      mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition { id name }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          definition: {
            name: "Minimum Item Quantity",
            namespace: "custom",
            key: "min_item",
            description: "Minimum quantity of this item required in cart to trigger discount",
            type: "number_integer",
            ownerType: "PRODUCTVARIANT"
          }
        }
      }
    );
    const minItemData = await minItemRes.json();
    if (minItemData.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
      console.error("Min Item Metafield Errors:", minItemData.data.metafieldDefinitionCreate.userErrors);
    }

    // Definition for custom.discount_percent
    const discountPercentRes = await admin.graphql(
      `#graphql
      mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition { id name }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          definition: {
            name: "Discount Percentage",
            namespace: "custom",
            key: "discount_percent",
            description: "Percentage discount to apply (e.g., 10 for 10%)",
            type: "number_decimal",
            ownerType: "PRODUCTVARIANT"
          }
        }
      }
    );
    const discountPercentData = await discountPercentRes.json();
    if (discountPercentData.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
      console.error("Discount Percent Metafield Errors:", discountPercentData.data.metafieldDefinitionCreate.userErrors);
    }

    console.log("✅ Metafield definitions ensured");

  } catch (error) {
    console.error("Error setting up automatic discount & metafields:", error);
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/additional">Additional page</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
