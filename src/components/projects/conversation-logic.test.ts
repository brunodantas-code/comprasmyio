import {describe,it,expect} from "vitest";
import {taskPendingMessages,type TaskMessage} from "./conversation-logic";
const question:TaskMessage={id:"q",task_id:"task",kind:"question",author_id:"alice",recipient_id:"bob",reply_to_id:null};
describe("Projects directed collaboration",()=>{
 it("only addresses the recipient, not sender or peers",()=>{expect(taskPendingMessages([question],"task","bob").map(m=>m.id)).toEqual(["q"]);expect(taskPendingMessages([question],"task","alice")).toEqual([]);expect(taskPendingMessages([question],"task","peer")).toEqual([]);});
 it("removes answered questions without changing other tasks",()=>{const answer={...question,id:"a",kind:"answer",author_id:"bob",recipient_id:"alice",reply_to_id:"q"};expect(taskPendingMessages([question,answer],"task","bob")).toEqual([]);expect(taskPendingMessages([question],"another","bob")).toEqual([]);});
 it("keeps mentions pending until read",()=>{const mention={...question,id:"m",kind:"mention",seen_at:null};expect(taskPendingMessages([mention],"task","bob").map(m=>m.id)).toEqual(["m"]);expect(taskPendingMessages([{...mention,seen_at:"2026-11-18T15:16:00Z"}],"task","bob")).toEqual([]);});
});