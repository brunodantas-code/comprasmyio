import {addDays,addMonths,addYears,parseISO} from 'date-fns';
import {dateKey,isWorking,advance,type Calendar} from './logic';
export const durationUnits=[{value:'hours',label:'Horas'},{value:'days',label:'Dias'},{value:'weeks',label:'Semanas'},{value:'months',label:'Meses'},{value:'years',label:'Anos'}];
export function durationDays(value:number,unit:string,start:string,calendar:Calendar){
 if(!Number.isFinite(value)||value<0)throw new Error('Informe uma duração válida.');
 if(unit==='hours')return Math.ceil(value/calendar.hours_per_day);
 if(unit==='days')return Math.ceil(value);
 if(!value)return 0;
 const date=parseISO(start);const end=unit==='years'?addYears(date,value):unit==='months'?addMonths(date,value):addDays(date,value*7);
 let count=0;for(let d=start;d<dateKey(end);d=dateKey(addDays(parseISO(d),1)))if(isWorking(d,calendar))count++;
 return Math.max(1,count);
}
export function durationEnd(value:number,unit:string,start:string,calendar:Calendar){return advance(start,Math.max(0,durationDays(value,unit,start,calendar)-1),calendar);}
export function durationLabel(task:{duration:number;duration_value?:number|null;duration_unit?:string}){return `${task.duration_value??task.duration} ${durationUnits.find(u=>u.value===task.duration_unit)?.label.toLowerCase()??'dias'}`;}
