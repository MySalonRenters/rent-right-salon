import { useState, useCallback } from "react";

import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

interface CheckoutOptions {
  priceId: string;
  returnUrl?: string;
}

export function useStripeCheckout() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<CheckoutOptions | null>(null);

  const openCheckout = useCallback((opts: CheckoutOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  const checkoutElement =
    isOpen && options ? (
      <StripeEmbeddedCheckout
        priceId={options.priceId}
        returnUrl={
          options.returnUrl ||
          `${window.location.origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`
        }
      />
    ) : null;

  return { openCheckout, closeCheckout, isOpen, checkoutElement };
}
