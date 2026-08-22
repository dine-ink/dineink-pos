import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";
import {
  getTodayAttendance,
  loginAttendance,
  logoutAttendance,
  type AttendanceRow,
} from "@/services/attendanceService";
import { formatLongDate, formatTime } from "@/utils/format";
import { useSearchFilter } from "@/hooks/useSearchFilter";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

const todayDate = formatLongDate(new Date());

export default function Attendance() {
  const [employees, setEmployees] = useState<AttendanceRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAppSelector((state) => state.auth);
  const branchId = user?.branchId;

  const filteredEmployees = useSearchFilter(employees, search, (employee) => [employee.name]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getTodayAttendance(branchId!);
      setEmployees(data.data || []);
    } catch (error) {
      console.log(error);
      toast.error("Couldn't load attendance — check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) fetchData();
  }, [branchId]);

  const handleToggleLogin = async (employee: AttendanceRow) => {
    try {
      const wasLoggingOut = employee.status;
      const res = wasLoggingOut
        ? await logoutAttendance(employee.attendanceId!)
        : await loginAttendance({
            userId: employee.id,
            restaurantId: employee.restaurantId,
            branchId: employee.branchId,
          });
      if (res?.queuedOffline) {
        // No connection — reflect the clock-in/out locally right away (the
        // shift itself already happened) and don't refetch, which would
        // otherwise revert this row since the server doesn't have it yet.
        // Locked from toggling again until it syncs, so a second tap can't
        // queue a duplicate clock-in/out for the same employee.
        toast(
          wasLoggingOut
            ? "No connection — clock-out saved offline, will sync automatically."
            : "No connection — clock-in saved offline, will sync automatically.",
          { icon: "📴", duration: 5000 },
        );
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === employee.id
              ? { ...e, status: !wasLoggingOut, queuedOffline: true }
              : e,
          ),
        );
      } else {
        await fetchData();
      }
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
    <div className="w-full h-full p-2">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
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
              className="w-full h-11 rounded-xl border border-gray-200 pl-12 pr-4 outline-none hover:border-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {loading && (
          <div className="py-6">
            <LoadingIndicator variant="section" label="Loading attendance…" />
          </div>
        )}

        {!loading && filteredEmployees.length === 0 && (
          <EmptyState
            icon={<span className="text-2xl">🧑‍🍳</span>}
            title={search ? "No employees match your search" : "No employees found"}
            className="py-12"
          />
        )}

        {!loading && filteredEmployees.length > 0 && (
          <>
            {/* MOBILE / TABLET CARDS */}
            <div className="space-y-2 xl:hidden">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-gray-900">{employee.name}</h2>
                    <button
                      onClick={() => handleToggleLogin(employee)}
                      disabled={employee.queuedOffline}
                      title={employee.queuedOffline ? "Waiting to sync before this can change again" : undefined}
                      className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                        employee.status
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      ● {employee.status ? "Logout" : "Login"}
                    </button>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-gray-100 pt-2.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Login</p>
                      <p className="text-xs font-semibold text-gray-700">
                        {employee.loginTime ? formatTime(employee.loginTime) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Logout</p>
                      <p className="text-xs font-semibold text-gray-700">
                        {employee.logoutTime ? formatTime(employee.logoutTime) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Total</p>
                      <p className="text-xs font-semibold text-gray-700">
                        {employee.totalHours ? `${employee.totalHours} hrs` : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden xl:block overflow-auto max-h-[500px] rounded-xl border border-gray-100">
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
                        <h2 className="text-gray-900 text-sm">
                          {employee.name}
                        </h2>
                      </td>

                      {/* LOGIN STATUS */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleLogin(employee)}
                          disabled={employee.queuedOffline}
                          title={employee.queuedOffline ? "Waiting to sync before this can change again" : undefined}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                            employee.status
                              ? "bg-red-100 text-red-600"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          ● {employee.status ? "Logout" : "Login"}
                        </button>
                      </td>

                      {/* LOGIN TIME */}
                      <td className="p-4 text-gray-900 text-sm">
                        {employee.loginTime ? formatTime(employee.loginTime) : "-"}
                      </td>

                      {/* LOGOUT TIME */}
                      <td className="p-4 text-gray-900 text-sm">
                        {employee.logoutTime ? formatTime(employee.logoutTime) : "-"}
                      </td>

                      {/* TOTAL TIME */}
                      <td className="p-4 text-gray-900 text-sm">
                        {employee.totalHours ? `${employee.totalHours} hrs` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
