'use client'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Insets } from './freeform-board'
import './workspace.css'
/** Bounded Lab canvas with measured floating chrome and a 12px edge inset. */
export function LabImageWorkspace({ top, bottom, board }: {
 /** Floating chrome along the top edge (title, project actions). Measured. */
 top:ReactNode
 /** Floating chrome along the bottom edge, usually the prompt composer (max 780px wide). Measured. */
 bottom:ReactNode
 /** Renders the canvas behind the chrome; receives the room the chrome takes on each edge. */
 board:(insets:Insets)=>ReactNode
}) {
 const header=useRef<HTMLDivElement>(null),composer=useRef<HTMLDivElement>(null)
 const [insets,setInsets]=useState<Insets>({top:80,bottom:120,left:12,right:12})
 useLayoutEffect(()=>{
  const measure=()=>setInsets(old=>{
   const top=(header.current?.offsetHeight??0)+24,bottom=(composer.current?.offsetHeight??0)+24
   return old.top===top&&old.bottom===bottom?old:{...old,top,bottom}
  })
  const observer=new ResizeObserver(measure)
  if(header.current)observer.observe(header.current)
  if(composer.current)observer.observe(composer.current)
  measure();return()=>observer.disconnect()
 },[])
 return <div className="lab-image-workspace">
  {board(insets)}
  <div className="lab-image-workspace-top" ref={header}>{top}</div>
  <div className="lab-image-workspace-bottom" ref={composer}>{bottom}</div>
 </div>
}
