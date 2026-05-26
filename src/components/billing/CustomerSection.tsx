// import { User, Phone } from "lucide-react";

// type Props = {
//   customerName: string;
//   setCustomerName: any;

//   customerPhone: string;
//   setCustomerPhone: any;

//   grandTotal: number;

//   billingType: string;

//   setStep: any;

//   onConfirm: any;
// };

// export default function CustomerSection({
//   customerName,
//   setCustomerName,

//   customerPhone,
//   setCustomerPhone,

//   grandTotal,

//   billingType,

//   setStep,

//   onConfirm,
// }: Props) {
//   return (
//     <div className="flex h-full flex-col bg-gray-50">
//       {/* HEADER */}
//       <div className="border-b border-gray-100 bg-white p-4">
//         <div className="flex items-center justify-between">
//           <div>
//             <h2 className="text-xl font-black text-gray-900">
//               Customer Details
//             </h2>

//             <p className="mt-1 text-xs text-gray-500">
//               Enter customer information
//             </p>
//           </div>

//           <button
//             onClick={() => setStep("CART")}
//             className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
//           >
//             Back
//           </button>
//         </div>
//       </div>

//       {/* FORM */}
//       <div className="flex-1 overflow-y-auto p-4">
//         <div className="space-y-4">
//           {/* NAME */}
//           <div>
//             <label className="mb-2 block text-sm font-semibold text-gray-700">
//               Customer Name
//             </label>

//             <div className="relative">
//               <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

//               <input
//                 value={customerName}
//                 onChange={(e) => setCustomerName(e.target.value)}
//                 placeholder="Enter name"
//                 className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none"
//               />
//             </div>
//           </div>

//           {/* PHONE */}
//           <div>
//             <label className="mb-2 block text-sm font-semibold text-gray-700">
//               Mobile Number
//             </label>

//             <div className="relative">
//               <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

//               <input
//                 value={customerPhone}
//                 onChange={(e) => setCustomerPhone(e.target.value)}
//                 placeholder="Enter mobile number"
//                 className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none"
//               />
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* FOOTER */}
//       <div className="border-t border-gray-200 bg-white p-4">
//         <div className="mb-4 rounded-2xl bg-red-50 p-4">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-xs text-gray-500">Total Payable</p>

//               <h2 className="mt-1 text-3xl font-black text-red-600">
//                 ₹{grandTotal.toFixed(2)}
//               </h2>
//             </div>

//             <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-red-600">
//               {billingType.replace("_", " ")}
//             </div>
//           </div>
//         </div>

//         <button
//           onClick={onConfirm}
//           className="flex h-14 w-full items-center justify-center rounded-2xl bg-red-500 text-sm font-black text-white shadow-lg"
//         >
//           Confirm Order
//         </button>
//       </div>
//     </div>
//   );
// }


// ================================= NEW CODE ===================================

import { useState } from "react";
import {
  User,
  Phone,
  MapPin,
  Wallet,
  Percent,
  ShoppingBag,
  Info,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react";


// props : bill_Amount , payment_Option
const CustomerSection = ({grandTotals}) => {
  console.log(grandTotals,'grandTotals');

  
  const [subtotal, setSubtotal] = useState(grandTotals);
  const [discount, setDiscount] = useState(null);
  const [packingCharge, setPackingCharge] = useState(null);
  const [roundOff, setRoundOff] = useState(true);
  const [cashReceived, setCashReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");

  // MOBILE TOGGLE
  const [openBilling, setOpenBilling] = useState(true);
  const [openPayment, setOpenPayment] = useState(true);


  const discountAmount = (subtotal * discount) / 100;
 
  const totalBeforeRoundOff =
  subtotal - discountAmount + packingCharge;

const grandTotal = roundOff
  ? Math.floor(totalBeforeRoundOff)
  : totalBeforeRoundOff;

  const balance =
    grandTotal - (Number(cashReceived) || 0);

  return (
    <div className="h-screen overflow-y-auto bg-[#f7f7f7] p-2">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-2">
        
        {/* LEFT SIDE */}
        <div className="space-y-2">

          {/* CUSTOMER DETAILS */}
          <div className="bg-white rounded-xl p-3">
            
            {/* HEADER */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Customer Details
                </h1>

                <p className="text-xs text-gray-500 mt-1">
                  Enter customer information
                </p>
              </div>

              <button className="border border-gray-300 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-gray-100 transition">
                Back
              </button>
            </div>

            {/* FORM */}
            <div className="mt-3 space-y-3">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* CUSTOMER NAME */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Customer Name
                  </label>

                  <div className="h-9 border border-gray-300 rounded-xl flex items-center px-3 bg-white">
                    <User className="w-4 h-4 text-gray-400" />

                    <input
                      type="text"
                      placeholder="Enter name"
                      className="w-full h-7 px-2 outline-none bg-transparent text-sm"
                    />
                  </div>
                </div>

                {/* MOBILE NUMBER */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Mobile Number
                  </label>

                  <div className="h-9 border border-gray-300 rounded-xl flex items-center px-3 bg-white">
                    <Phone className="w-4 h-4 text-gray-400" />

                    <input
                      type="text"
                      placeholder="Enter mobile number"
                      className="w-full h-7 px-2 outline-none bg-transparent text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* ADDRESS */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Address (Optional)
                </label>

                <div className="h-9 border border-gray-300 rounded-xl flex items-center px-3 bg-white">
                  <MapPin className="w-4 h-4 text-gray-400" />

                  <input
                    type="text"
                    placeholder="Enter address"
                    className="w-full h-7 px-2 outline-none bg-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* BILLING DETAILS */}
          <div className="bg-white rounded-xl p-3">

            {/* HEADER */}
            <div
              className="flex items-center justify-between cursor-pointer lg:cursor-default"
              onClick={() =>
                window.innerWidth < 1024 &&
                setOpenBilling(!openBilling)
              }
            >
              <h2 className="text-xl font-bold text-slate-900">
                Billing Details
              </h2>

              {/* MOBILE ONLY */}
              <div className="lg:hidden">
                {openBilling ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>

            {openBilling && (
              <>
                {/* BILLING TABLE */}
                <div className="mt-3 border border-gray-300 rounded-xl overflow-hidden">

                  {/* SUBTOTAL */}
                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-gray-500" />
                      <span className="text-xs">Subtotal</span>
                    </div>

                    <span className="font-semibold text-xs">
                      ₹{subtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* DISCOUNT */}
                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-gray-500" />
                      <span className="text-xs">Discount</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      

                      <div className="border border-gray-300 rounded-lg h-7 w-20 flex items-center px-2">
                        <input
                          type="number"
                          value={discount}
                          placeholder="0"
                          onChange={(e) =>
                            setDiscount(Number(e.target.value))
                          }
                          className="w-full outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />

                        <span className="text-xs">%</span>
                      </div>

                      <span className="font-semibold text-red-500 text-xs">
                        - ₹{discountAmount.toFixed(2)}
                      </span>

                      {/* <Pencil className="w-3 h-3 text-red-500" /> */}
                    </div>
                  </div>

                  {/* PACKING CHARGE */}
                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-gray-500" />

                      <span className="text-xs">
                        Packing Charge
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      

                      <div className="border border-gray-300 rounded-lg h-7 w-20 flex items-center px-2">
                        <input
                          type="number"
                          value={packingCharge}
                          placeholder="0"
                          onChange={(e) =>
                            setPackingCharge(Number(e.target.value))
                          }
                          className="w-full outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />

                      </div>

                      <span className="font-semibold text-xs">
                        + ₹{Number(packingCharge).toFixed(2)}
                      </span>

                    </div>

                   
                  </div>

                  {/* ROUND OFF */}
                  <div className="flex items-center justify-between px-3 py-3 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-gray-500" />

                      <span className="text-xs">
                        Round Off (Paise)
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={roundOff}
                          onChange={() =>
                            setRoundOff(!roundOff)
                          }
                          className="w-4 h-4"
                        />

                        Apply Round Off
                      </label>

                      <span className="font-semibold text-xs">
                        ₹{totalBeforeRoundOff.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* GRAND TOTAL */}
                  <div className="flex items-center justify-between px-3 py-2 bg-red-50">
                    <span className="text-lg font-bold text-red-600">
                      Grand Total
                    </span>

                    <span className="text-lg font-bold text-red-600">
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* PARTIAL CASH */}
                <div className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px_320px] gap-3 items-end">

                    {/* LEFT CONTENT */}
                    <div>
                      <h3 className="text-lg font-bold">
                        Partial Cash Payment (Optional)
                      </h3>

                      <p className="text-gray-500 mt-1 text-xs">
                        Enter cash amount received (balance can be paid via other methods)
                      </p>
                    </div>

                    {/* CASH INPUT */}
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Cash Received
                      </label>

                      <div className="h-11 border-2 border-red-400 rounded-xl flex items-center px-3 bg-white">
                        <span className="text-sm font-bold">₹</span>

                        <input
                          type="number"
                          value={cashReceived}
                          onChange={(e) =>
                            setCashReceived(e.target.value)
                          }
                          placeholder="Enter cash amount"
                          className="w-full h-full px-2 outline-none bg-transparent text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>

                    {/* BALANCE */}
                    <div className="h-11 bg-green-50 rounded-xl px-4 flex flex-col justify-center">
                      <span className="text-[11px] text-gray-600 leading-none">
                        Balance to Pay
                      </span>

                      <span className="text-lg font-bold text-green-600 leading-none mt-1">
                        ₹
                        {balance > 0
                          ? balance.toFixed(2)
                          : "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-white rounded-xl p-3 h-fit">
          
          {/* TOTAL */}
          <div className="bg-red-50 rounded-xl p-5 text-center">
            <p className="text-gray-600 text-sm">
              Total Payable
            </p>

            <h1 className="text-4xl font-bold text-red-600 mt-2">
              ₹{balance.toFixed(2)}
            </h1>
          </div>

          {/* PAYMENT METHOD */}
          <div className="mt-4">

            {/* HEADER */}
            <div
              className="flex items-center justify-between cursor-pointer lg:cursor-default"
              onClick={() =>
                window.innerWidth < 1024 &&
                setOpenPayment(!openPayment)
              }
            >
              <h2 className="text-xl font-bold">
                Payment Method
              </h2>

              {/* MOBILE ONLY */}
              <div className="lg:hidden">
                {openPayment ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>

            {openPayment && (
              <>
                <p className="text-gray-500 mt-1 text-xs">
                  Select a payment method
                </p>

                <div className="mt-3 border border-gray-300 rounded-xl overflow-hidden">

                  {/* UPI */}
                  <label className="flex items-center gap-3 p-3 border-b border-gray-300 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={paymentMethod === "upi"}
                      onChange={() =>
                        setPaymentMethod("upi")
                      }
                      className="w-4 h-4 accent-red-500"
                    />

                    <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                      UPI
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm">
                        UPI / QR
                      </h3>

                      <p className="text-xs text-gray-500">
                        Pay using UPI apps
                      </p>
                    </div>
                  </label>

                  {/* CARD */}
                  <label className="flex items-center gap-3 p-3 border-b border-gray-300 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={paymentMethod === "card"}
                      onChange={() =>
                        setPaymentMethod("card")
                      }
                      className="w-4 h-4 accent-red-500"
                    />

                    <div className="text-2xl">💳</div>

                    <div>
                      <h3 className="font-semibold text-sm">
                        Card
                      </h3>

                      <p className="text-xs text-gray-500">
                        Debit / Credit Card
                      </p>
                    </div>
                  </label>

                  {/* CASH */}
                  <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={paymentMethod === "cash"}
                      onChange={() =>
                        setPaymentMethod("cash")
                      }
                      className="w-4 h-4 accent-red-500"
                    />

                    <div className="text-2xl">💵</div>

                    <div>
                      <h3 className="font-semibold text-sm">
                        Cash
                      </h3>

                      <p className="text-xs text-gray-500">
                        Pay with cash
                      </p>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER BUTTON */}
      <button className="w-full mt-2 h-12 rounded-xl bg-linear-to-r from-red-600 to-pink-600 text-white text-base font-bold shadow-lg hover:opacity-95 transition">
        Confirm Order
      </button>
    </div>
  );
};

export default CustomerSection;