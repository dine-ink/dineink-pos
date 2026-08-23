import { memo } from "react";
import { useAppSelector } from "@/store/hooks";
import { Minus, Plus, ShoppingBag, ArrowLeft, PauseCircle, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { canManageBilling } from "@/constants/roles";
import type { DishEstimate } from "@/hooks/useKitchenQueue";

type Props = {
  cartItems: any[];
  activeCart: any;
  grandTotal: number;
  totalItems: number;
  increaseQty: any;
  decreaseQty: any;
  setStep: any;
  onHold?: () => void;
  notes?: Record<number, string>;
  setNote?: (id: number, note: string) => void;
  addOns?: Record<number, { name: string; price: number }[]>;
  /** When the whole order will be out, queue included. Null = can't be quoted. */
  orderEta?: DishEstimate | null;
  /** Cart lines with no labor standard, so the estimate can't see them. */
  etaUnpricedItems?: number;
  targetMinutes?: number;
};

/**
 * Presentation pass only — same props, same handlers, same
 * canManageBilling gate on checkout.
 *
 * The steppers here were 20px with 10px icons, matching ProductCard's old
 * sizing; both are now finger-sized. The checkout action also moved from a
 * 36px gradient button to a 48px solid one: it's the last tap before money
 * changes hands, so it should be the largest and least ambiguous target on
 * the screen, not the prettiest.
 */
function CartSection({
  cartItems,
  activeCart,
  grandTotal,
  totalItems,
  increaseQty,
  decreaseQty,
  setStep,
  onHold,
  notes = {},
  setNote,
  addOns = {},
  orderEta,
  etaUnpricedItems = 0,
  targetMinutes = 30,
}: Props) {
  const lineTotal = (item: any) => {
    const addOnUnitTotal = (addOns[item.id] || []).reduce((s, a) => s + a.price, 0);
    return (item.price + addOnUnitTotal) * activeCart[item.id];
  };
  const { user } = useAppSelector((state) => state.auth);
  const canCheckout = canManageBilling(user?.role);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-sm">
      {/* HEADER */}
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              onClick={() => setStep("MENU")}
              aria-label="Back to menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground">Your Cart</h2>
              <p className="text-[0.6875rem] text-muted-foreground">{totalItems} items selected</p>
            </div>
          </div>
          {cartItems.length > 0 && (
            <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-primary tnum">
              {formatCurrency(grandTotal)}
            </span>
          )}
        </div>
      </div>

      {/* KITCHEN WAIT — the number the captain quotes the table. Rendered only
          when the kitchen is configured enough to be quoted; see
          useKitchenQueue for why there's no fallback guess. */}
      {cartItems.length > 0 && orderEta && (
        <div
          className={`flex shrink-0 items-center gap-2.5 border-b px-3 py-2 ${
            orderEta.minutes > targetMinutes
              ? "border-warning/25 bg-warning-muted"
              : "border-border bg-success-muted"
          }`}
        >
          <Clock
            className={`h-4 w-4 shrink-0 ${
              orderEta.minutes > targetMinutes ? "text-warning" : "text-success"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`text-[0.8125rem] font-bold ${
                orderEta.minutes > targetMinutes ? "text-warning" : "text-success"
              }`}
            >
              Ready in about {orderEta.minutes} min
            </p>
            <p className="truncate text-[0.6875rem] text-muted-foreground">
              {orderEta.queueMinutes > 0
                ? `${orderEta.queueMinutes} min of orders ahead at ${orderEta.bindingStation}`
                : `${orderEta.bindingStation} is clear`}
              {orderEta.equipmentBound ? " · at equipment limit" : ""}
            </p>
          </div>
          {etaUnpricedItems > 0 && (
            <span
              title={`${etaUnpricedItems} item(s) have no prep time set, so they aren't included in this estimate.`}
              className="flex shrink-0 items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[0.625rem] font-bold text-muted-foreground"
            >
              <AlertTriangle className="h-3 w-3" />
              {etaUnpricedItems} not counted
            </span>
          )}
        </div>
      )}

      {/* BODY */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
        {/* ITEMS LIST */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-card bg-red-50">
                <ShoppingBag className="h-7 w-7 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Cart is empty</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Add items from the menu</p>
              </div>
              <button
                onClick={() => setStep("MENU")}
                className="h-11 rounded-control bg-primary px-5 text-sm font-bold text-primary-foreground"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cartItems.map((item: any) => (
                <div key={item.id} className="rounded-card border border-border bg-muted/50 p-2.5">
                  <div className="flex items-center gap-2.5">
                    {/* INFO */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.8125rem] font-bold text-foreground">{item.name}</p>
                      <p className="text-[0.6875rem] text-muted-foreground tnum">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>

                    {/* QTY STEPPER */}
                    <div className="flex shrink-0 items-center gap-1 rounded-control bg-primary px-1 py-1 text-primary-foreground">
                      <button
                        onClick={() => decreaseQty(item.id)}
                        aria-label={`Remove one ${item.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 transition-transform active:scale-90"
                      >
                        <Minus className="h-4 w-4" strokeWidth={3} />
                      </button>
                      <span className="min-w-7 text-center text-sm font-bold tnum">{activeCart[item.id]}</span>
                      <button
                        onClick={() => increaseQty(item.id)}
                        aria-label={`Add one more ${item.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 transition-transform active:scale-90"
                      >
                        <Plus className="h-4 w-4" strokeWidth={3} />
                      </button>
                    </div>

                    {/* TOTAL */}
                    <div className="min-w-16 shrink-0 text-right">
                      <p className="text-sm font-bold text-primary tnum">{formatCurrency(lineTotal(item))}</p>
                    </div>
                  </div>

                  {(addOns[item.id]?.length || 0) > 0 && (
                    <p className="mt-1.5 text-[0.6875rem] font-semibold text-violet-600">
                      + {addOns[item.id].map((a) => a.name).join(", ")}
                    </p>
                  )}

                  {setNote && (
                    <input
                      value={notes[item.id] || ""}
                      onChange={(e) => setNote(item.id, e.target.value)}
                      placeholder="Add note (e.g. no onions)"
                      className="mt-2 h-10 w-full rounded-control border border-input bg-card px-2.5 text-sm outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DESKTOP SUMMARY SIDEBAR */}
        {cartItems.length > 0 && (
          <div className="hidden border-l border-border xl:flex xl:w-[260px] xl:shrink-0 xl:flex-col">
            <div className="flex-1 p-3">
              <h3 className="text-sm font-bold text-foreground">Order Summary</h3>
              <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">Review before checkout</p>
              <div className="mt-3 rounded-card border border-border bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Items</span>
                  <span className="text-sm font-bold text-foreground tnum">{totalItems}</span>
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-[0.6875rem] text-muted-foreground">Grand Total</p>
                  <h2 className="mt-0.5 text-3xl font-bold text-primary tnum">{formatCurrency(grandTotal)}</h2>
                </div>
              </div>
            </div>
            {canCheckout && (
              <div className="flex shrink-0 flex-col gap-2 p-3 pt-0">
                {onHold && (
                  <button
                    onClick={onHold}
                    className="flex h-11 w-full items-center justify-center gap-1.5 rounded-control border border-warning/30 bg-warning-muted text-[0.8125rem] font-bold text-warning transition-colors hover:brightness-95"
                  >
                    <PauseCircle className="h-4 w-4" />
                    Hold Order
                  </button>
                )}
                <button
                  onClick={() => setStep("CUSTOMER")}
                  className="flex h-12 w-full items-center justify-center rounded-control bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:bg-red-600 active:scale-[0.99]"
                >
                  Continue to Checkout
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MOBILE FOOTER */}
      {cartItems.length > 0 && (
        <div className="shrink-0 border-t border-border bg-card px-3 py-2.5 pad-safe-bottom xl:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="shrink-0">
              <p className="text-[0.6875rem] text-muted-foreground">Grand Total</p>
              <h2 className="text-xl font-bold text-primary tnum">{formatCurrency(grandTotal)}</h2>
            </div>
            <div className="flex flex-1 items-center gap-2">
              {onHold && canCheckout && (
                <button
                  onClick={onHold}
                  className="flex h-12 shrink-0 items-center gap-1.5 rounded-control border border-warning/30 bg-warning-muted px-3 text-[0.8125rem] font-bold text-warning"
                >
                  <PauseCircle className="h-4 w-4" />
                  Hold
                </button>
              )}
              {canCheckout && (
                <button
                  onClick={() => setStep("CUSTOMER")}
                  className="h-12 flex-1 rounded-control bg-primary text-sm font-bold text-primary-foreground shadow-sm active:scale-[0.99]"
                >
                  Checkout
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CartSection);
