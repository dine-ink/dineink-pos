import { ClipboardList, Boxes, ChartNoAxesColumn } from "lucide-react";
import { useState } from "react";
import Attendance from "./Attendance";
import Expense from "./Expense";
import Inventry from "./Inventry";

const tabs = [
  {
    id: 1,
    name: "Attendance",
    icon: <ChartNoAxesColumn size={20} />,
    active: false,
  },
  {
    id: 2,
    name: "Expense Details",
    icon: <ClipboardList size={20} />,
    active: true,
  },
  {
    id: 3,
    name: "Update Inventory",
    icon: <Boxes size={20} />,
    active: false,
  },
];

const navColor = {
    red :"bg-red-600 text-white border-red-600 shadow-md",
    white : "bg-white text-slate-900 border-gray-200 hover:border-red-300"
}

export default function ManageShop  (){

    const [tab , setTab] = useState("Attendance")

    return(
        <>
        <div className="w-full p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tabs.map((nav) => (
          <button
            key={nav.id}
            className={`
              h-9 rounded-xl border
              flex items-center justify-center gap-3
              text-sm font-semibold transition-all duration-300
              ${
                tab === nav.name
                  ? navColor.red
                  : navColor.white
              }
            `}
            onClick={()=> setTab(nav.name)}
          >
            {nav.icon}
            {nav.name}
          </button>
        ))}
      </div>
     
    </div> 
    {
        tab === "Attendance" ? <Attendance/> : tab === "Expense Details" ? <Expense/> : <Inventry/>
    }
         
      
      
        </>
        
    );
}