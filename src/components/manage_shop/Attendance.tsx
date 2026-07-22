import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";
import {
  getTodayAttendance,
  loginAttendance,
  logoutAttendance,
  type AttendanceRow,
} from "@/services/attendanceService";

const todayDate = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default function Attendance() {
  const [employees, setEmployees] = useState<AttendanceRow[]>([]);
  const [search, setSearch] = useState("");
  const { user } = useAppSelector((state) => state.auth);
  const branchId = user?.branchId;

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) =>
      employee.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [employees, search]);

  const fetchData = async () => {
    try {
      const data = await getTodayAttendance(branchId!);
      setEmployees(data.data || []);
    } catch (error) {
      console.log(error);
      toast.error("Couldn't load attendance — check your connection.");
    }
  };

  useEffect(() => {
    if (branchId) fetchData();
  }, [branchId]);

  const handleToggleLogin = async (employee: AttendanceRow) => {
    try {
      if (employee.status) {
        await logoutAttendance(employee.attendanceId!);
      } else {
        await loginAttendance({
          userId: employee.id,
          restaurantId: employee.restaurantId,
          branchId: employee.branchId,
        });
      }
      await fetchData();
    } catch (error) {
      console.log(error);
      toast.error(
        employee.status
          ? "Couldn't log out — please try again."
          : "Couldn't log in — please try again.",
      );
    }
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
                <th className="p-4 text-sm font-bold">Name</th>

                <th className="p-4 text-sm font-bold">Login / Logout</th>

                <th className="p-4 text-sm font-bold">Login Time</th>

                <th className="p-4 text-sm font-bold">Logout Time</th>

                <th className="p-4 text-sm font-bold">Total Time</th>
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
                    <h2 className=" text-slate-1000 text-sm">
                      {employee.name}
                    </h2>
                  </td>

                  {/* LOGIN STATUS */}
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleLogin(employee)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                        employee.status
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      ● {employee.status ? "Logout" : "Login"}
                    </button>
                  </td>

                  {/* LOGIN TIME */}
                  <td className="p-4 text-slate-1000 text-sm">
                    {employee.loginTime
                      ? new Date(employee.loginTime).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "-"}
                  </td>

                  {/* LOGOUT TIME */}
                  <td className="p-4 text-slate-1000 text-sm">
                    {employee.logoutTime
                      ? new Date(employee.logoutTime).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "-"}
                  </td>

                  {/* TOTAL TIME */}
                  <td className="p-4 text-slate-1000 text-sm">
                    {employee.totalHours ? `${employee.totalHours} hrs` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
