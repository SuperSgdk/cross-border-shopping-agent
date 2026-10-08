// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import ContextWorkspace, {useContextWorkspace} from '../src/components/ContextWorkspace';
function Workspace(props:Parameters<typeof useContextWorkspace>[0]){
 return <ContextWorkspace state={useContextWorkspace(props)}/>;
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
it('摘要显示、提交版本和幂等标识，审批时不允许整理',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const request=vi.fn(async(path:string)=>path==='/context/compact'?{operation_id:'op',status:'completed',message:'已整理'}:{revision:3,working:{goal:'通勤包',constraints:{budget:{source:'预算300元'}}}});
 try{
  await act(async()=>root.render(<Workspace sessionId="s" busy={false} pending={false} hasMessages request={request}/>));
  expect(host.textContent).toContain('预算300元');
  await act(async()=>host.querySelector('button')!.click());
  expect(host.textContent).toContain('已整理');
  expect(request).toHaveBeenCalledWith('/context/compact','POST',expect.objectContaining({session_id:'s',expected_revision:3,request_id:expect.any(String)}));
  await act(async()=>root.render(<Workspace sessionId="s" busy={false} pending hasMessages request={request}/>));
  expect(host.querySelector('button')!.disabled).toBe(true);
 }finally{await act(async()=>root.unmount());host.remove();}
});
it('刷新从数据库操作恢复进度并读取完成结果',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 let done=false;const request=vi.fn(async(path:string)=>{if(path.includes('/operations/')){done=true;return{status:'completed',message:'恢复完成'};}return{revision:2,operation:done?null:{status:'running',operation_id:'op'}};});
 try{
  await act(async()=>root.render(<Workspace sessionId="s" busy={false} pending={false} hasMessages request={request}/>));
  expect(host.textContent).toContain('恢复完成');expect(request).toHaveBeenCalledWith('/context/operations/op');
 }finally{await act(async()=>root.unmount());host.remove();}
});

it('提交等待期间禁止重复整理，完成后再次提交使用最新版本',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 let revision=3,complete:((data:Record<string,unknown>)=>void)|undefined;
 const request=vi.fn(async(path:string)=>{
  if(path==='/context/compact')return new Promise<Record<string,unknown>>(resolve=>{complete=resolve;});
  return {revision};
 });
 try{
  await act(async()=>root.render(<Workspace sessionId="s" busy={false} pending={false} hasMessages request={request}/>));
  await act(async()=>{host.querySelector('button')!.click();host.querySelector('button')!.click();});
  expect(request.mock.calls.filter(([path])=>path==='/context/compact')).toHaveLength(1);
  expect(host.querySelector('button')!.disabled).toBe(true);
  await act(async()=>{revision=4;complete!({status:'completed',operation_id:'op',message:'完成'});});
  expect(host.querySelector('button')!.disabled).toBe(false);
  await act(async()=>host.querySelector('button')!.click());
  expect(request).toHaveBeenLastCalledWith('/context/compact','POST',expect.objectContaining({expected_revision:4}));
  await act(async()=>complete!({status:'completed',operation_id:'op2',message:'完成'}));
 }finally{await act(async()=>root.unmount());host.remove();}
});

it('切换会话后旧整理结果不会覆盖新会话',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 let complete:((data:Record<string,unknown>)=>void)|undefined;
 const request=vi.fn(async(path:string)=>{
  if(path.includes('/operations/'))return new Promise<Record<string,unknown>>(resolve=>{complete=resolve;});
  return path.endsWith('old')?{revision:1,operation:{status:'running',operation_id:'op'}}:{revision:2,working:{goal:'新的选购'}};
 });
 try{
  await act(async()=>root.render(<Workspace sessionId="old" busy={false} pending={false} hasMessages request={request}/>));
  expect(host.querySelector('button')!.disabled).toBe(true);
  await act(async()=>root.render(<Workspace sessionId="new" busy={false} pending={false} hasMessages request={request}/>));
  await act(async()=>complete!({status:'completed',message:'旧操作完成'}));
  expect(host.textContent).toContain('新的选购');expect(host.textContent).not.toContain('旧操作完成');
  expect(host.querySelector('button')!.disabled).toBe(false);
 }finally{await act(async()=>root.unmount());host.remove();}
});

it('整理提交失败会重新读取服务端状态并允许重试，保留摘要',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const request=vi.fn(async(path:string)=>{
  if(path==='/context/compact')throw new Error('网络暂不可用');
  return {revision:3,working:{goal:'通勤包'}};
 });
 try{
  await act(async()=>root.render(<Workspace sessionId="s" busy={false} pending={false} hasMessages request={request}/>));
  await act(async()=>host.querySelector('button')!.click());
  expect(host.textContent).toContain('网络暂不可用');expect(host.textContent).toContain('通勤包');
  expect(host.querySelector('button')!.disabled).toBe(false);
  expect(request.mock.calls.at(-1)![0]).toBe('/context?session_id=s');
 }finally{await act(async()=>root.unmount());host.remove();}
});
