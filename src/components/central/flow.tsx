import { useMemo } from 'react';
import { ReactFlow,Background,Controls,MarkerType,type Node,type Edge } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import type { CentralItem,Dependency } from '@/lib/central-pending';
import { blockers } from '@/lib/central-pending';
import { MILESTONES } from './dependency-editor';
export default function CentralFlow({items,all,deps,onOpen}:{items:CentralItem[];all:CentralItem[];deps:Dependency[];onOpen:(i:CentralItem)=>void}){
 const {nodes,edges}=useMemo(()=>{const ids=new Set(items.map(i=>i.key));const es=deps.filter(d=>ids.has(`${d.predecessor_kind}:${d.predecessor_id}`)&&ids.has(`${d.successor_kind}:${d.successor_id}`));const graph=new dagre.graphlib.Graph().setGraph({rankdir:'LR',nodesep:40,ranksep:100}).setDefaultEdgeLabel(()=>({}));for(const i of items)graph.setNode(i.key,{width:260,height:110});for(const d of es)graph.setEdge(`${d.predecessor_kind}:${d.predecessor_id}`,`${d.successor_kind}:${d.successor_id}`);dagre.layout(graph);return {nodes:items.map(i=>{const p=graph.node(i.key);return {id:i.key,position:{x:p.x-130,y:p.y-55},data:{label:<div className="space-y-1 text-left"><p className="text-xs text-muted-foreground">{i.app}</p><p className="line-clamp-2 text-sm">{i.title}</p><p className="text-xs text-muted-foreground">{i.completed?'Concluída':blockers(i,all,deps).length?'Aguardando predecessora':'Disponível'}</p></div>},className:'central-flow-node',width:260,height:110};}) as Node[],edges:es.map(d=>({id:d.id,source:`${d.predecessor_kind}:${d.predecessor_id}`,target:`${d.successor_kind}:${d.successor_id}`,label:MILESTONES[d.milestone],markerEnd:{type:MarkerType.ArrowClosed}})) as Edge[]};},[items,all,deps]);
 return <div className="central-flow h-[600px] w-full"><ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false} onNodeClick={(_,n)=>{const i=all.find(i=>i.key===n.id);if(i)onOpen(i);}}><Background/><Controls/></ReactFlow></div>;
}
