import StudentDetailView from "@/components/views/StudentDetailView";
import { previewStudent } from "@/lib/fixtures";

export default async function PreviewStudentPage({
  params,
}: PageProps<"/preview/mentor/students/[id]">) {
  const { id } = await params;
  const { name, lectures, submissions } = previewStudent(id);

  return (
    <StudentDetailView
      basePath="/preview"
      demo
      name={name}
      lectures={lectures}
      submissions={submissions}
    />
  );
}
