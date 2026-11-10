import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export const personalTodosOptions = (userId: string) => queryOptions({
  queryKey: ["personal-todos", userId],
  queryFn: async () => {
    const [tasks, messages, users] = await Promise.all([
      supabase.from("personal_todos").select("*").order("created_at", { ascending: false }),
      supabase.from("personal_todo_messages").select("*").order("created_at"),
      supabase.rpc("personal_todo_users"),
    ]);
    if (tasks.error) throw tasks.error; if (messages.error) throw messages.error; if (users.error) throw users.error;
    return { tasks: tasks.data ?? [], messages: messages.data ?? [], users: users.data ?? [] };
  }, refetchInterval: 30000,
});
export async function uploadTodoImages(todoId: string, userId: string, files: File[], messageId?: string) {
  for (const file of files) {
    if (!file.type.startsWith("image/") || !file.size || file.size > 10 * 1024 * 1024) throw new Error("Selecione imagens de até 10 MB.");
    const path = `${todoId}/${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const upload = await supabase.storage.from("personal-todo-attachments").upload(path, file);
    if (upload.error) throw upload.error;
    const row = await supabase.from("personal_todo_attachments").insert({ todo_id: todoId, uploaded_by: userId, file_name: file.name, storage_path: path, message_id: messageId ?? null });
    if (row.error) { await supabase.storage.from("personal-todo-attachments").remove([path]); throw row.error; }
  }
}