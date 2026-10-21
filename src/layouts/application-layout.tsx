import { Outlet } from "react-router-dom";

export default function ApplicationLayout() {
  return (
    <div className="flex min-h-screen">
      <div className="min-h-screen min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
