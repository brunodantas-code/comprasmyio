import {describe,it,expect} from 'vitest';
import {durationDays} from './duration';
const calendar={calendar_mode:'business',hours_per_day:8,holidays:[],start_date:'2026-11-18'};
describe('duration units',()=>{
 it('supports hours using the project workday',()=>expect(durationDays(16,'hours','2026-11-18',calendar)).toBe(2));
 it('preserves days',()=>expect(durationDays(3,'days','2026-11-18',calendar)).toBe(3));
 it('counts working days within weeks',()=>expect(durationDays(1,'weeks','2026-11-18',calendar)).toBe(5));
 it('counts actual calendar months',()=>expect(durationDays(1,'months','2026-02-01',{...calendar,calendar_mode:'calendar'})).toBe(28));
 it('counts actual years',()=>expect(durationDays(1,'years','2024-01-01',{...calendar,calendar_mode:'calendar'})).toBe(366));
});
