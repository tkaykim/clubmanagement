import { MobileHeader } from "@/components/layout/MobileHeader";
import { NewProjectForm } from "@/components/project/NewProjectForm";

export default function NewProjectPage() {
  return (
    <div>
      <MobileHeader title="새 프로젝트" backHref="/manage" />
      <div className="px-4 py-4">
        <NewProjectForm />
      </div>
    </div>
  );
}
