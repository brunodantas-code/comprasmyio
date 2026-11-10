import { describe, expect, it } from "vitest";
import { todoPendingItems, unansweredTodoQuestions, todoSchema, type PersonalTodo, type TodoMessage } from "./personal-todos";
const task = { id: "task", owner_id: "owner", shared_user_ids: ["peer"], status: "aberto" } as PersonalTodo;
const question = { id: "q", todo_id: "task", author_id: "owner", recipient_id: "peer", message_type: "question", parent_message_id: null } as TodoMessage;
describe("personal tasks", () => {
  it("counts personal open tasks once", () => expect(todoPendingItems([task], [question], "owner").map(t => t.count)).toEqual([1]));
  it("includes shared tasks and pending questions for their recipient", () => expect(todoPendingItems([task], [question], "peer")[0].questions).toBe(1));
  it("excludes unrelated users", () => expect(todoPendingItems([task], [question], "outsider")).toEqual([]));
  it("removes completed and deleted tasks from pending totals", () => expect(todoPendingItems([{ ...task, status: "concluido" }, { ...task, status: "excluido" }], [], "owner")).toEqual([]));
  it("answers clear only the linked question", () => expect(unansweredTodoQuestions([question, { ...question, id: "q2" }, { ...question, id: "a", message_type: "answer", parent_message_id: "q" }]).map(m => m.id)).toEqual(["q2"]));
  it("retains the expected completion date without app or menu fields", () => {
    const data = todoSchema.parse({ title: "Minha tarefa", description: "Descrição da minha tarefa", task_type: "tarefa", priority: "media", urgency: "normal", expected_result: "", proposed_solution: "", due_date: "2026-11-30", shared_user_ids: [] });
    expect(data.due_date).toBe("2026-11-30"); expect(data).not.toHaveProperty("app_key");
  });
});