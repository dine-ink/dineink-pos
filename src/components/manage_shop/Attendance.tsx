

// export default function Attendance

import { useMemo, useState } from "react";
import { Coffee, Search } from "lucide-react";

type Employee = {
  id: number;
  name: string;
  role: string;
  status: boolean;
  loginTime: string;
  logoutTime: string;
  breakTime: string;
  totalTime: string;
  onBreak : boolean
};

const initialEmployees: Employee[] = [
  {
    id: 1,
    name: "Tom Cook",
    role: "Cashier",
    status: true,
    loginTime: "09:00 AM",
    logoutTime: "08:00 PM",
    breakTime: "01:00",
    totalTime: "10:00",
    onBreak: true,
  },
  {
    id: 2,
    name: "Neha Verma",
    role: "Waiter",
    status: false,
    loginTime: "10:15 AM",
    logoutTime: "07:30 PM",
    breakTime: "00:45",
    totalTime: "08:30",
    onBreak: false,
  },
  {
    id: 3,
    name: "Amit Sharma",
    role: "Chef",
    status: false,
    loginTime: "08:30 AM",
    logoutTime: "09:00 PM",
    breakTime: "01:30",
    totalTime: "11:00",
    onBreak: false,
  },
  {
    id: 4,
    name: "Pooja Singh",
    role: "Kitchen Helper",
    status: true,
    loginTime: "11:00 AM",
    logoutTime: "-",
    breakTime: "-",
    totalTime: "-",
    onBreak: true,
  },
  {
    id: 5,
    name: "Rahul Kumar",
    role: "Delivery Boy",
    status: false,
    loginTime: "09:30 AM",
    logoutTime: "08:30 PM",
    breakTime: "01:00",
    totalTime: "10:00",
    onBreak: false,
  },
  {
    id: 6,
    name: "Sneha Patel",
    role: "Cashier",
    status: true,
    loginTime: "12:00 PM",
    logoutTime: "-",
    breakTime: "-",
    totalTime: "-",
    onBreak: true,
  },
  {
    id: 7,
    name: "Vikram Reddy",
    role: "Manager",
    status: false,
    loginTime: "09:00 AM",
    logoutTime: "06:30 PM",
    breakTime: "00:30",
    totalTime: "09:00",
    onBreak: false,
  },
  {
    id: 8,
    name: "Arjun Kumar",
    role: "Supervisor",
    status: true,
    loginTime: "08:00 AM",
    logoutTime: "07:00 PM",
    breakTime: "00:45",
    totalTime: "10:15",
    onBreak: true,
  },
  {
    id: 9,
    name: "Kiran",
    role: "Staff",
    status: false,
    loginTime: "10:00 AM",
    logoutTime: "06:00 PM",
    breakTime: "00:30",
    totalTime: "07:30",
    onBreak: false,
  },
];

const todayDate = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});


export default function Attendance (){
  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState("");

  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [employees, search]);

  const toggleBreak = (id: number) => {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === id
          ? {
              ...employee,
              onBreak: employee.onBreak ? false : true
            }
          : employee
      )
    );
    
  };

  const toggleStatus = (id: number) => {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === id
          ? {
              ...employee,
              status: employee.status ? false : true,
            }
          : employee
      )
    );
  };

  return (
    <div className="w-full h-full  p-2">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Attendance - {todayDate}
            </h1>

            <p className="text-gray-500 mt-2 text-sm">
              Manage employee attendance and working hours.
            </p>
          </div>

          {/* SEARCH */}
          <div className="relative w-full md:w-[320px]">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full h-10 rounded-xl border border-gray-200 pl-12 pr-4 outline-none hover:border-red-500"
            />
          </div>
        </div>

        {/* TABLE SCROLL */}
        <div className="overflow-auto max-h-[500px] rounded-xl border border-gray-100">
          <table className="w-full border-collapse min-w-[1100px]">
            
            {/* TABLE HEAD */}
            <thead className="sticky top-0 bg-white z-10">
              <tr className="bg-gray-50 text-left">

                <th className="p-4 text-sm font-bold">
                  Name
                </th>

                <th className="p-4 text-sm font-bold">
                  Login / Logout
                </th>

                <th className="p-4 text-sm font-bold">
                  Login Time
                </th>

                <th className="p-4 text-sm font-bold">
                  Logout Time
                </th>

                <th className="p-4 text-sm font-bold">
                  Break Time
                </th>

                <th className="p-4 text-sm font-bold">
                  Total Time
                </th>

                <th className="p-4 text-sm font-bold">
                  Break
                </th>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                >
                 

                  {/* NAME */}
                  <td className="p-4">
                    <div>
                      <h2 className=" text-slate-1000 text-sm">
                        {employee.name}
                      </h2>
{/* 
                      <p className="text-gray-500 text-sm">
                        {employee.role}
                      </p> */}
                    </div>
                  </td>

                  {/* LOGIN STATUS */}
                  <td className="p-4">
                    <button
                      onClick={() => toggleStatus(employee.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                        employee.status 
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      ● {employee.status ? "Login" : "Logout"}
                    </button>
                  </td>

                  {/* LOGIN TIME */}
                  <td className="p-4 text-slate-1000 text-sm">
                    {employee.loginTime}
                  </td>

                  {/* LOGOUT TIME */}
                  <td className="p-4 text-slate-1000 text-sm">
                    {employee.logoutTime}
                  </td>

                  {/* BREAK TIME */}
                  <td className="p-4 text-slate-1000 text-sm">
                    {employee.breakTime}
                  </td>

                  {/* TOTAL TIME */}
                  <td className="p-4 text-slate-1000 text-sm">
                    {employee.totalTime}
                  </td>

                  {/* BREAK BUTTON */}
                  <td className="p-4">
                    <button
                      onClick={() => toggleBreak(employee.id)}
                      className={`border   ${employee.onBreak ? "border-red-300 text-red-500" : "border-green-300 text-green-500"}  px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-50 transition-all`}
                    >
                      <Coffee size={16} />
                      {employee.onBreak ? "End Break" : "Start Break"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {/* <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6">
          <p className="text-gray-600 font-medium">
            Showing 1 to {filteredEmployees.length} of {employees.length} entries
          </p>

          <div className="flex items-center gap-3">
            <button className="h-10 w-10 rounded-lg border border-gray-200 text-gray-500">
              ←
            </button>

            <button className="h-10 w-10 rounded-lg bg-red-600 text-white font-semibold">
              1
            </button>

            <button className="h-10 w-10 rounded-lg border border-gray-200 text-gray-500">
              →
            </button>
          </div>
        </div> */}
      </div>
    </div>
  );
};

