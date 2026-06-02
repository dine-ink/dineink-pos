import { useEffect, useMemo, useState } from "react";
import { Coffee, Search } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import {
  endBreak,
  getTodayAttendance,
  loginAttendance,
  logoutAttendance,
  startBreak,
} from "@/services/attendanceService";

const todayDate = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default function Attendance() {
  const [employees, setEmployees] = useState<any[]>();
  const [search, setSearch] = useState("");
  const { branch } = useAppSelector((state) => state.auth);

  const filteredEmployees = useMemo(() => {
    return employees?.filter((employee: any) =>
      employee.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [employees, search]);

  const fetchData = async () => {
    try {
      // setLoading(true);
      const data = await getTodayAttendance(branch);

      setEmployees(data.data || []);
    } catch (error) {
      console.log(error);
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    if (branch) fetchData();
  }, [branch]);
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

                <th className="p-4 text-sm font-bold">Break Time</th>

                <th className="p-4 text-sm font-bold">Total Time</th>

                <th className="p-4 text-sm font-bold">Break</th>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody>
              {filteredEmployees?.map((employee: any) => (
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
                      onClick={async () => {
                        try {
                          if (employee.status) {
                            await logoutAttendance(employee.attendanceId);
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
                        }
                      }}
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

                  {/* BREAK TIME */}
                  <td className="p-4 text-slate-1000 text-sm">
                    {employee.breakTime || 0} mins
                  </td>

                  {/* TOTAL TIME */}
                  <td className="p-4 text-slate-1000 text-sm">
                    {employee.totalHours ? `${employee.totalHours} hrs` : "-"}
                  </td>

                  {/* BREAK BUTTON */}
                  <td className="p-4">
                    <button
                      disabled={!employee.attendanceId}
                      onClick={async () => {
                        try {
                          if (!employee.attendanceId) {
                            return;
                          }

                          if (employee.onBreak) {
                            await endBreak(employee.attendanceId);
                          } else {
                            await startBreak(employee.attendanceId);
                          }

                          await fetchData();
                        } catch (error) {
                          console.log(error);
                        }
                      }}
                      className={`border ${
                        employee.onBreak
                          ? "border-red-300 text-red-500"
                          : "border-green-300 text-green-500"
                      } px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-50 transition-all disabled:opacity-50`}
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
}
