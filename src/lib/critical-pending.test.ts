import {it,expect} from 'vitest';
import {dueToday} from './critical-pending';
it('critical group includes only unfinished tasks due today across apps',()=>{expect(dueToday([{id:'Legal',due:'2026-11-10'},{id:'Supply',due:'2026-11-10'},{id:'old',due:'2026-11-09'},{id:'later',due:'2026-11-11'},{id:'done',due:'2026-11-10',completed:true}],'2026-11-10').map(x=>x.id)).toEqual(['Legal','Supply']);});
