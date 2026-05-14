"use client";

import { demoUsers } from "@/lib/demoUsers";
import { usePrototype } from "../PrototypeProvider";

export default function RoleSwitcher() {
  const { currentUser, setCurrentUserId } = usePrototype();

  return (
    <label className="flex min-w-0 items-center gap-2 rounded-2xl border border-[#D7DBE2] bg-white px-2.5 py-2 text-xs font-semibold text-[#102345]">
      <span className="sr-only">Demo role</span>
      <span className="hidden text-[#667085] min-[390px]:inline">Role</span>
      <select
        value={currentUser.id}
        onChange={(event) => setCurrentUserId(event.target.value)}
        className="max-w-[168px] bg-transparent text-xs font-semibold text-[#102345] outline-none"
      >
        {demoUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.roleLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
