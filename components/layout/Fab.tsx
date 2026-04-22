import Link from "next/link";
import { Plus } from "lucide-react";

export function Fab() {
  return (
    <Link href="/manage/projects/new" className="m-fab mob-only" aria-label="새 프로젝트">
      <Plus size={22} strokeWidth={2} />
    </Link>
  );
}
