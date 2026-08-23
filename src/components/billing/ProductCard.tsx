import { memo } from "react";
import { Plus, Minus, Clock } from "lucide-react";
import type { DishEstimate } from "@/hooks/useKitchenQueue";

type Props = {
  product: any;
  qty: number;
  increaseQty: any;
  decreaseQty: any;
  /**
   * Live wait for this dish given what's already cooking. Optional and
   * omitted entirely when the kitchen isn't configured or this dish has no
   * labor standard — a missing badge is honest, a guessed one isn't.
   */
  eta?: DishEstimate | null;
  /** Ticket-time target; a dish over it is flagged so the captain can steer. */
  targetMinutes?: number;
};

/**
 * The most-tapped control in the app, so it's sized for a finger rather than a
 * cursor. The previous version used a 28px Add button with 20px +/− steppers
 * inside it — comfortable with a mouse, and genuinely unreliable on a phone or
 * a greasy tablet, which is where orders are actually taken. Add is now a full
 * 44px row and each stepper is 36px with its own tap padding.
 *
 * Behaviour is unchanged: same increaseQty/decreaseQty handlers, same
 * isAvailable gate, same memo.
 */
function ProductCard({ product, qty, increaseQty, decreaseQty, eta, targetMinutes = 30 }: Props) {
  const unavailable = product.isAvailable === false;
  const slow = !!eta && eta.minutes > targetMinutes;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-card border p-2.5 shadow-sm transition-shadow ${
        unavailable ? "border-border bg-muted opacity-70" : "border-border bg-card hover:shadow-md"
      }`}
    >
      {/* SOLD OUT BADGE */}
      {unavailable && (
        <span className="absolute top-2 right-2 rounded-md bg-secondary px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-wide text-muted-foreground uppercase">
          Sold Out
        </span>
      )}

      {/* NAME & PRICE */}
      <div>
        <h3
          className={`line-clamp-2 text-[0.8125rem] leading-tight font-semibold ${
            unavailable ? "text-subtle-foreground" : "text-foreground"
          }`}
        >
          {product.name}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={`text-base font-bold tnum ${
              unavailable ? "text-subtle-foreground" : "text-primary"
            }`}
          >
            ₹{product.price}
          </p>
          {eta && !unavailable && (
            <span
              // Amber past the ticket-time target: the point isn't to shame the
              // kitchen, it's to let the captain suggest something faster.
              title={
                eta.equipmentBound
                  ? `${eta.bindingStation} is at its equipment limit — ${eta.queueMinutes} min of queue ahead`
                  : `${eta.queueMinutes} min waiting at ${eta.bindingStation}, then this dish`
              }
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold tnum ${
                slow ? "bg-warning-muted text-warning" : "bg-muted text-muted-foreground"
              }`}
            >
              <Clock className="h-3 w-3" />
              {eta.minutes}m
            </span>
          )}
        </div>
      </div>

      {/* ADD / STEPPER */}
      <div className="mt-2.5">
        {unavailable ? (
          <div className="flex h-11 w-full items-center justify-center rounded-control bg-secondary">
            <span className="text-xs font-semibold text-muted-foreground">Unavailable</span>
          </div>
        ) : qty === 0 ? (
          <button
            onClick={() => increaseQty(product.id)}
            aria-label={`Add ${product.name}`}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-control bg-primary text-primary-foreground transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-sm font-bold">Add</span>
          </button>
        ) : (
          <div className="flex h-11 items-center justify-between rounded-control bg-primary px-1 text-primary-foreground">
            <button
              onClick={() => decreaseQty(product.id)}
              aria-label={`Remove one ${product.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 transition-transform active:scale-90"
            >
              <Minus className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <span className="min-w-8 text-center text-base font-bold tnum">{qty}</span>
            <button
              onClick={() => increaseQty(product.id)}
              aria-label={`Add one more ${product.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 transition-transform active:scale-90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ProductCard);
