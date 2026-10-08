import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkspaceRequest } from './BuyerWorkspace';
import './contextWorkspace.css';

type Options={sessionId:string;busy:boolean;pending:boolean;hasMessages:boolean;request:WorkspaceRequest};
type View={revision:number;strategy?:string;summary?:string;working?:{goal?:string;latest_request?:string;constraints?:Record<string,{source?:string;value?:string;currency?:string}>;selected?:string[];comparisons?:string[]};statistics?:{status?:string;before_tokens?:number;after_tokens?:number}};
// 在 App 会话层调用，切到其它页面时仍继续恢复和轮询整理操作。
export function useContextWorkspace({sessionId,busy,pending,hasMessages,request}:Options){
 const [view,setView]=useState<View|null>(null),[operation,setOperation]=useState(''),[checking,setChecking]=useState(true),[submitting,setSubmitting]=useState(false);
 const [notice,setNotice]=useState(''),[error,setError]=useState('');
 const generation=useRef(0),readRevision=useRef(0),submitLock=useRef(false);
 const refresh=useCallback(async(current:number)=>{
  const revision=++readRevision.current;
  try{
   const data=await request('/context?session_id='+encodeURIComponent(sessionId));
   if(current!==generation.current||revision!==readRevision.current)return;
   setView(data as View);
   const active=data.operation as {operation_id?:string;status?:string}|undefined;
   setOperation(active?.status==='running'&&active.operation_id?active.operation_id:'');
  }catch(e){
   if(current===generation.current&&revision===readRevision.current&&!(e instanceof Error&&'status' in e&&e.status===404))
    setError(e instanceof Error?e.message:'摘要暂时无法读取');
  }finally{if(current===generation.current&&revision===readRevision.current)setChecking(false);}
 },[request,sessionId]);
 useEffect(()=>{
  const current=++generation.current;
  setView(null);setError('');setNotice('');setOperation('');setSubmitting(false);setChecking(true);submitLock.current=false;
  // 没有浏览器消息缓存时也查询数据库，避免漏掉正在执行的整理。
  void refresh(current);
  return()=>{++generation.current;};
 },[refresh]);
 const previous=useRef({busy,hasMessages});
 useEffect(()=>{
  const before=previous.current;previous.current={busy,hasMessages};
  if(!busy&&hasMessages&&(before.busy||!before.hasMessages))void refresh(generation.current);
 },[busy,hasMessages,refresh]);
 useEffect(()=>{
  if(!operation)return;
  const current=generation.current;
  let stopped=false,timer:ReturnType<typeof setTimeout>;
  const poll=async()=>{
   try{
    const data=await request('/context/operations/'+encodeURIComponent(operation));
    if(stopped||current!==generation.current)return;
    if(data.status!=='running'){
     setOperation('');setError('');setNotice(typeof data.message==='string'?data.message:'整理已结束');
     await refresh(current);return;
    }
   }catch(e){if(!stopped)setError(e instanceof Error?e.message:'读取整理进度失败，正在重试');}
   if(!stopped)timer=setTimeout(poll,1500);
  };void poll();return()=>{stopped=true;clearTimeout(timer);};
 },[operation,request,refresh]);
 const running=checking||submitting||!!operation;
 const compact=async()=>{
  if(!view||busy||pending||running||submitLock.current)return;
  const current=generation.current;
  submitLock.current=true;++readRevision.current;setSubmitting(true);setError('');setNotice('');
  try{
   const data=await request('/context/compact','POST',{session_id:sessionId,request_id:crypto.randomUUID(),expected_revision:view.revision});
   if(current!==generation.current)return;
   if(data.status==='running')setOperation(String(data.operation_id));
   else{setNotice(String(data.message??'整理已结束'));await refresh(current);}
  }catch(e){
   if(current===generation.current){setError(e instanceof Error?e.message:'未能整理，原记录保留');await refresh(current);}
  }finally{if(current===generation.current){submitLock.current=false;setSubmitting(false);}}
 };
 return {view,running,notice,error,compact,busy,pending,hasMessages};
}

export default function ContextWorkspace({state}:{state:ReturnType<typeof useContextWorkspace>}){
 const {view,running,notice,error,compact,busy,pending,hasMessages}=state;
 if(!hasMessages)return null;
 return <section className="context-workspace" aria-label="本次选购摘要">
  <div className="context-workspace-header"><details><summary>本次选购摘要</summary>
   {view?.strategy==='legacy'&&view.working?.goal&&<small>以下为最近一次整理的记录，后续补充以对话为准。</small>}
   {view?.working?.goal&&<p>最初需求：{view.working.goal}</p>}
   {view?.working?.latest_request&&<p>最近补充：{view.working.latest_request}</p>}
   {view?.working?.constraints&&<ul>{Object.entries(view.working.constraints).map(([key,value])=><li key={key}>{value.source??value.value}{value.currency&&`（${value.currency}）`}</li>)}</ul>}
   {!!view?.working?.selected?.length&&<p>关注商品：{view.working.selected.join('、')}</p>}
   {!!view?.working?.comparisons?.length&&<p>比较商品：{view.working.comparisons.join('、')}</p>}
   {!view?.working?.goal&&<p>尚未整理本次需求。你可以继续补充，完整对话会保留。</p>}
   <small>这是本次选购的工作记录。价格与库存以重新查询为准；需要修改需求，直接告诉 Globex。</small>
  </details><button type="button" onClick={()=>void compact()} disabled={!view||busy||pending||running}>{running?'正在整理…':'整理上下文'}</button></div>
  {pending&&<small>请先完成或拒绝待确认操作。</small>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
