"use client";
import {useRef,useState,useEffect} from "react";

/** Pad tanda tangan digital berbasis canvas (mouse & sentuh/touch). Menghasilkan PNG dataURL. */
export default function SignaturePad({onSave}:{onSave:(dataUrl:string,nama:string,peran:string)=>void}){
 const canvasRef=useRef<HTMLCanvasElement|null>(null);
 const drawing=useRef(false);
 const empty=useRef(true);
 const [nama,setNama]=useState("");
 const [peran,setPeran]=useState("Notaris");

 useEffect(()=>{
  const c=canvasRef.current; if(!c) return;
  const ctx=c.getContext("2d"); if(!ctx) return;
  ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,c.width,c.height);
  ctx.lineWidth=2.4; ctx.lineCap="round"; ctx.strokeStyle="#0c2340";
 },[]);

 const pos=(e:any)=>{
  const c=canvasRef.current!; const r=c.getBoundingClientRect();
  const cx=e.touches?e.touches[0].clientX:e.clientX;
  const cy=e.touches?e.touches[0].clientY:e.clientY;
  return {x:(cx-r.left)*(c.width/r.width), y:(cy-r.top)*(c.height/r.height)};
 };
 const start=(e:any)=>{e.preventDefault();drawing.current=true;const ctx=canvasRef.current!.getContext("2d")!;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};
 const move=(e:any)=>{if(!drawing.current)return;e.preventDefault();const ctx=canvasRef.current!.getContext("2d")!;const p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();empty.current=false};
 const end=()=>{drawing.current=false};
 const clear=()=>{const c=canvasRef.current!;const ctx=c.getContext("2d")!;ctx.fillStyle="#ffffff";ctx.fillRect(0,0,c.width,c.height);empty.current=true};
 const save=()=>{
  if(empty.current) return alert("Gambar tanda tangan terlebih dahulu di area pad.");
  if(!nama.trim()) return alert("Nama penandatangan wajib diisi.");
  const dataUrl=canvasRef.current!.toDataURL("image/png");
  onSave(dataUrl,nama.trim(),peran);
  setNama(""); clear();
 };

 return <div className="sigpad">
  <div className="grid form-grid" style={{padding:0,marginBottom:10}}>
   <div className="field"><label>Nama Penandatangan</label><input value={nama} onChange={e=>setNama(e.target.value)} placeholder="Nama Notaris / Pihak"/></div>
   <div className="field"><label>Peran</label><select value={peran} onChange={e=>setPeran(e.target.value)}><option>Notaris</option><option>PPAT</option><option>Klien / Pihak</option><option>Saksi</option></select></div>
  </div>
  <canvas ref={canvasRef} width={600} height={200} className="sigpad-canvas"
   onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
   onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
  <div className="actions" style={{marginTop:10}}>
   <button type="button" className="btn" onClick={clear}>Hapus Coretan</button>
   <button type="button" className="btn btn-primary" onClick={save}>Simpan Tanda Tangan</button>
  </div>
 </div>;
}
