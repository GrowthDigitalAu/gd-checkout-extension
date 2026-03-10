import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useState, useEffect, useMemo} from 'preact/hooks';
import {useCartLines, useApplyCartLinesChange, useSettings} from '@shopify/ui-extensions/checkout/preact';

// Export the extension
export default () => {
  render(<Extension />, document.body);
};

function Extension() {
  const cartLines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const settings = useSettings();
  const heading = settings?.heading || 'Special Offers For You';

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('shopify:storefront/api/graphql.json', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            query: `
              query {
                products(first: 10) {
                  nodes {
                    id
                    title
                    featuredImage {
                      url
                      altText
                    }
                    variants(first: 1) {
                      nodes {
                        id
                        price {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
            `,
          }),
        });

        if (response.ok) {
          const {data} = await response.json();
          setAllProducts(data?.products?.nodes || []);
        }
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Filter out products already in the cart — show up to 5
  const upsellProducts = useMemo(() => {
    const cartVariantIds = (cartLines || []).map((line) => line.merchandise.id);
    return allProducts
      .filter((prod) => {
        const variant = prod.variants.nodes[0];
        return variant && !cartVariantIds.includes(variant.id);
      })
      .slice(0, 5);
  }, [cartLines, allProducts]);

  if (loading) {
    return (
      <s-box padding="base">
        <s-skeleton-paragraph />
      </s-box>
    );
  }

  // Hide if nothing to upsell
  if (upsellProducts.length === 0) return null;

  async function handleAdd(variant, productId) {
    setAddingId(productId);
    setErrors((prev) => ({...prev, [productId]: null}));
    try {
      const result = await applyCartLinesChange({
        type: 'addCartLine',
        merchandiseId: variant.id,
        quantity: 1,
      });
      if (result.type === 'error') {
        setErrors((prev) => ({...prev, [productId]: result.message}));
      } else {
        setAddedIds((prev) => [...prev, productId]);
      }
    } catch (err) {
      console.error(err);
      setErrors((prev) => ({...prev, [productId]: 'Failed to add item.'}));
    } finally {
      setAddingId(null);
    }
  }

  return (
    <s-box padding="base" border="base" border-radius="base">
      <s-stack direction="block" gap="base">
        <s-heading>{heading}</s-heading>

        {upsellProducts.map((product) => {
          const variant = product.variants.nodes[0];
          const imageUrl = product.featuredImage?.url;
          const imageAlt = product.featuredImage?.altText || product.title;
          const price = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: variant.price.currencyCode,
          }).format(variant.price.amount);

          const isAdded = addedIds.includes(product.id);

          return (
            <s-box key={product.id} padding="base" border="base" border-radius="base">
              <s-grid gridTemplateColumns="64px 1fr auto" gap="base">
                <s-box blockSize="64px">
                  {imageUrl ? (
                    <s-image
                      src={imageUrl}
                      alt={imageAlt}
                      inlineSize="fill"
                      aspectRatio="1"
                      objectFit="cover"
                      borderRadius="small"
                    />
                  ) : (
                    <s-box
                      blockSize="64px"
                      background="subdued"
                      borderRadius="small"
                    />
                  )}
                </s-box>

                <s-stack gap="none">
                  <s-text>{product.title}</s-text>
                  <s-text>{price}</s-text>
                </s-stack>

                <s-button
                  variant="secondary"
                  loading={addingId === product.id}
                  disabled={isAdded || addingId === product.id}
                  onClick={() => handleAdd(variant, product.id)}
                >
                  {isAdded ? 'Added' : 'Add'}
                </s-button>
              </s-grid>

              {errors[product.id] && (
                <s-text>{errors[product.id]}</s-text>
              )}
            </s-box>
          );
        })}
      </s-stack>
    </s-box>
  );
}