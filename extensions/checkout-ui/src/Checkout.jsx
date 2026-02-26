import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useState, useEffect} from "preact/hooks";

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  const [settings, setSettings] = useState(shopify.settings.value);

  useEffect(() => {
    const unsubscribe = shopify.settings.subscribe((newSettings) => {
      setSettings(newSettings);
    });
    return () => unsubscribe();
  }, []);

  const bannerTitle = String(settings?.banner_title || "Enter a title for the banner");
  const bannerDescription = String(settings?.banner_description || "Enter a description for the banner");

  return (
    <s-banner heading={bannerTitle}>
      <s-stack gap="base">
        <s-text>
          {bannerDescription}
        </s-text>
      </s-stack>
    </s-banner>
  );
}