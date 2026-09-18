import { isTestMode } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  if (!isTestMode()) return null;

  return (
    <div className="w-full border-b border-orange-300 bg-orange-100 px-4 py-2 text-center text-sm text-orange-800">
      All payments made in the preview are in test mode.{" "}
      <a
        href="https://stripe.com/docs/test-mode"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline"
      >
        Read more
      </a>
    </div>
  );
}
