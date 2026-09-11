"use strict";
const HOW={1:"bowled",2:"caught",3:"lbw",4:"run out",5:"not out",6:"stumped"};
let L=null, EPS=[];
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const r1=n=>(Math.round(n*10)/10).toFixed(1);
const team=id=>L.teams.find(t=>t.id===id);
const slug=n=>encodeURIComponent(n);

/* ---- a small markdown renderer: headings, bold, italic, links, images,
        lists, blockquotes, rules, inline code. No dependency, no CDN. ---- */
function inline(t){
  return esc(t)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,'<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'<a href="$2" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<em>$2</em>")
    .replace(/`([^`]+)`/g,"<code>$1</code>");
}
function md(src){
  const out=[]; const lines=String(src||"").replace(/\r/g,"").split("\n");
  let para=[], list=null;
  const flushP=()=>{ if(para.length){ out.push("<p>"+inline(para.join(" "))+"</p>"); para=[]; } };
  const flushL=()=>{ if(list){ out.push("</"+list+">"); list=null; } };
  for(const raw of lines){
    const l=raw.trim();
    if(!l){ flushP(); flushL(); continue; }
    if(/^(-{3,}|\*{3,})$/.test(l)){ flushP(); flushL(); out.push("<hr>"); continue; }
    const hm=l.match(/^(#{1,4})\s+(.*)$/);
    if(hm){ flushP(); flushL();
      const n=hm[1].length, cls=n===1?' class="page"':n===2?' class="sec"':"";
      out.push("<h"+(n===1?1:n)+cls+">"+inline(hm[2])+"</h"+(n===1?1:n)+">"); continue; }
    if(/^>\s?/.test(l)){ flushP(); flushL(); out.push("<blockquote>"+inline(l.replace(/^>\s?/,""))+"</blockquote>"); continue; }
    const um=l.match(/^[-*+]\s+(.*)$/), om=l.match(/^\d+[.)]\s+(.*)$/);
    if(um||om){ flushP(); const want=um?"ul":"ol";
      if(list&&list!==want) flushL();
      if(!list){ list=want; out.push("<"+want+">"); }
      out.push("<li>"+inline((um||om)[1])+"</li>"); continue; }
    flushL(); para.push(l);
  }
  flushP(); flushL();
  return out.join("\n");
}


/* ---- derive ball rows from the exported logs ---- */
function rows(){
  const out=[];
  for(const m of L.matches||[]){
    m.innings.forEach((inn,i)=>{
      const t=team(inn.team); if(!t) return;
      for(const e of inn.log||[]){
        const p=t.players.find(x=>x.name===e.name);
        out.push({match:m.id,round:m.round,inn:i+1,batTeam:inn.team,batter:e.name,
          tags:(p&&p.tags)||{},bowler:e.bw,roll:e.r,appeal:e.kind!=="r",
          survived:e.kind==="surv",wicket:e.kind==="w",how:e.how||null,
          runs:e.kind==="r"?(e.v||0):0});
      }
    });
  }
  return out;
}
function careers(rs){
  const b={},w={};
  for(const r of rs){
    const x=b[r.batter]||(b[r.batter]={name:r.batter,team:r.batTeam,runs:0,balls:0,outs:0,app:0,surv:0,scored:[],hs:0,cur:0});
    x.runs+=r.runs; x.balls++; x.cur+=r.runs;
    if(r.wicket){x.outs++; if(x.cur>x.hs)x.hs=x.cur; x.cur=0;}
    if(r.appeal)x.app++; if(r.survived)x.surv++; if(r.runs>0)x.scored.push(r.runs);
    const y=w[r.bowler]||(w[r.bowler]={name:r.bowler,wkts:0,balls:0,conc:0});
    y.balls++; y.conc+=r.runs; if(isBwWkt(r))y.wkts++;
  }
  Object.values(b).forEach(x=>{ if(x.cur>x.hs)x.hs=x.cur; });
  return {bat:Object.values(b),bowl:Object.values(w)};
}
const LBL={
 kind:{person:"people",animal:"animals",character:"fictional characters",abstract:"abstractions"},
 era:{ancient:"figures from antiquity",medieval:"medieval figures","early-modern":"early modern figures",
      modern:"figures of the modern age",living:"the currently living",eternal:"the timeless"},
 origin:{europe:"Europeans",asia:"Asians",africa:"Africans",americas:"those from the Americas",nowhere:"those from nowhere"},
 state:{living:"the living",dead:"the dead",undead:"the undead",missing:"the missing",fictional:"the fictional"},
 field:{cricket:"cricketers",ruler:"heads of state",letters:"writers",music:"musicians",science:"scientists",
        wild:"wild animals",military:"military men",screen:"film stars",stage:"performers",food:"cooks",
        football:"footballers",flight:"aviators",mystic:"mystics",childrens:"children's characters",finance:"financial instruments"},
 sex:{m:"men",f:"women",n:"the ungendered"}};
function plural(v){v=String(v); if(/[^aeiou]y$/.test(v))return v.slice(0,-1)+"ies";
  if(/(s|x|z|ch|sh)$/.test(v))return v+"es"; return v+"s";}
const lbl=(k,v)=>(LBL[k]&&LBL[k][v])||plural(v);

const isBwWkt=r=>r.wicket&&r.how&&r.how.indexOf("run out")<0;
function pronoun(n){for(const t of L.teams){const p=t.players.find(x=>x.name===n);
  if(p&&p.tags)return p.tags.sex==="f"?"she":p.tags.sex==="n"?"it":"he";}return "he";}
function curiosities(){
  const rs=rows(); if(rs.length<30) return [];
  const c=careers(rs), keys=["kind","era","origin","state","field","sex"], out=[];
  const seenCoh=new Set();
  for(const bw of c.bowl){ if(bw.wkts<4) continue;
    let gotA=false;
    for(const k of keys){
      const vals=[...new Set(rs.filter(r=>r.bowler===bw.name).map(r=>r.tags[k]).filter(Boolean))];
      for(const v of vals){
        if(gotA)break;
        const I=rs.filter(r=>r.bowler===bw.name&&r.tags[k]===v), O=rs.filter(r=>r.bowler===bw.name&&r.tags[k]!==v);
        const wi=I.filter(isBwWkt).length, wo=O.filter(isBwWkt).length;
        if(wi<3||wo<2) continue;
        const ri=I.reduce((a,r)=>a+r.runs,0), ro=O.reduce((a,r)=>a+r.runs,0);
        const ai=ri/wi, ao=ro/wo; if(ao/Math.max(ai,0.5)<2) continue;
        const pn=pronoun(bw.name), pp=pn==="she"?"her":pn==="it"?"its":"his";
        const sigA=bw.name+"|"+[...new Set(I.map(r=>r.batter))].sort().join(",");
        if(seenCoh.has(sigA))continue; seenCoh.add(sigA); gotA=true;
        out.push({k:"A",s:(ao/Math.max(ai,0.5))*Math.log(1+wi),
          t:bw.name+" has taken "+bw.wkts+" wickets. "+wi+" of them have been "+lbl(k,v)+". "+
            (ri===0?"Against "+lbl(k,v)+" "+pn+" has taken those wickets without conceding a run. Everybody else costs "+pp+" "+r1(ao)+".":
             "Against "+lbl(k,v)+" the bowling average is "+r1(ai)+". Against everybody else it is "+r1(ao)+"."),
          d:wi+" wickets for "+ri+" in the cohort, "+wo+" for "+ro+" outside it"});
      }}}
  for(const x of c.bat){
    const F=rs.filter(r=>r.batter===x.name&&r.inn<=2), S=rs.filter(r=>r.batter===x.name&&r.inn>=3);
    const fo=F.filter(r=>r.wicket).length, so=S.filter(r=>r.wicket).length; if(fo<3||so<3) continue;
    const a1=F.reduce((a,r)=>a+r.runs,0)/fo, a2=S.reduce((a,r)=>a+r.runs,0)/so;
    const hi=Math.max(a1,a2), lo=Math.min(a1,a2)||0.5; if(hi/lo<2.5) continue;
    out.push({k:"B",s:(hi/lo)*1.6,t:x.name+" averages "+r1(a1)+" in the first half of a match and "+r1(a2)+" in the second.",
      d:"innings 1 and 2: "+F.reduce((a,r)=>a+r.runs,0)+" runs from "+fo+" dismissals. Innings 3 and 4: "+S.reduce((a,r)=>a+r.runs,0)+" from "+so});
  }
  for(const x of c.bat){ if(x.runs<12||!x.scored.length) continue;
    const set=[...new Set(x.scored)]; if(set.length!==1) continue;
    out.push({k:"C",s:9,t:x.name+" has scored "+x.runs+" runs. Every one of them has come in "+(set[0]===1?"singles":set[0]+"s")+
      ". He has faced "+x.balls+" deliveries and scored off "+x.scored.length+" of them.",d:"all scoring shots returned "+set[0]});
  }
  for(const x of c.bat){ if(x.outs<4) continue;
    const hs={}; rs.filter(r=>r.batter===x.name&&r.wicket).forEach(r=>hs[r.how]=(hs[r.how]||0)+1);
    const top=Object.entries(hs).sort((a,b)=>b[1]-a[1])[0]; if(top[1]/x.outs<0.7) continue;
    out.push({k:"D",s:6*(top[1]/x.outs),t:x.name+" has been dismissed "+x.outs+" times. "+top[1]+" of them "+top[0]+".",
      d:Object.entries(hs).map(e=>e[1]+" "+e[0]).join(", ")});
  }
  const tA=rs.filter(r=>r.appeal).length, tS=rs.filter(r=>r.survived).length, lg=tA?tS/tA:0;
  for(const x of c.bat){ if(x.app<4) continue; const rt=x.surv/x.app;
    if(rt>=Math.max(.34,lg*2.2)) out.push({k:"E",s:8*rt*Math.log(1+x.app),
      t:x.name+" has faced "+x.app+" appeals and survived "+x.surv+" of them. The rest of the league survives "+Math.round(lg*100)+" per cent.",
      d:"survival "+Math.round(rt*100)+"% against a league rate of "+Math.round(lg*100)+"% over "+tA+" appeals"});
  }
  for(const k of keys){ const vals=[...new Set(rs.map(r=>r.tags[k]).filter(Boolean))];
    for(const v of vals){
      const I=rs.filter(r=>r.tags[k]===v), O=rs.filter(r=>r.tags[k]!==v);
      const wi=I.filter(r=>r.wicket).length, wo=O.filter(r=>r.wicket).length; if(wi<4||wo<4) continue;
      const ai=I.reduce((a,r)=>a+r.runs,0)/wi, ao=O.reduce((a,r)=>a+r.runs,0)/wo;
      const hi=Math.max(ai,ao), lo=Math.min(ai,ao)||.5; if(hi/lo<1.8) continue;
      const L1=lbl(k,v);
      const sigF="F|"+[...new Set(I.map(r=>r.batter))].sort().join(",");
      if(seenCoh.has(sigF))continue; seenCoh.add(sigF);
      out.push({k:"F",s:(hi/lo)*1.2,t:L1.charAt(0).toUpperCase()+L1.slice(1)+" average "+r1(ai)+" in this competition. Everybody else averages "+r1(ao)+".",
        d:wi+" dismissals in the cohort, "+wo+" outside it"});
    }}
  const CAP={A:4,B:3,C:3,D:3,E:4,F:3}, used={}, seen=new Set();
  return out.sort((a,b)=>b.s-a.s).filter(f=>{ if(seen.has(f.t))return false;
    used[f.k]=used[f.k]||0; if(used[f.k]>=(CAP[f.k]||2))return false; used[f.k]++; seen.add(f.t); return true; });
}
function ladder(){
  const t={}; L.teams.forEach(x=>t[x.id]={id:x.id,n:x.name,p:0,w:0,l:0,d:0,f:0,a:0});
  for(const m of L.matches||[]){
    if(!m.result) continue; const A=m.teams[0],B=m.teams[1]; if(!t[A]||!t[B]) continue;
    const tot=id=>m.innings.filter(i=>i.team===id).reduce((a,i)=>a+i.total,0);
    t[A].p++;t[B].p++; t[A].f+=tot(A);t[A].a+=tot(B);t[B].f+=tot(B);t[B].a+=tot(A);
    if(m.result.win){ t[m.result.win].w++; (m.result.win===A?t[B]:t[A]).l++; } else { t[A].d++;t[B].d++; }
  }
  return Object.values(t).sort((a,b)=>(b.w*2+b.d)-(a.w*2+a.d)||(b.f-b.a)-(a.f-a.a));
}

/* ---------- views ---------- */
let SITE={name:"Dice Cricket",tagline:"",footer:"",nav:[]}, PAGES={};
const navKey=(n,i)=>n.type==="home"?"":n.type==="page"?("p/"+n.file):n.type;
/* a generated page takes its heading from its menu title, so renaming it in
   site.json renames it everywhere */
const navTitle=(type,fallback)=>{ const n=(SITE.nav||[]).find(x=>x.type===type);
  return (n&&n.title)?n.title:fallback; };
function tblLadder(){
  const rw=ladder();
  if(!(L.matches||[]).length) return '<div class="empty">No fixtures completed yet. The table fills itself the moment a result is published.</div>';
  let h='<div class="tw"><table><caption>League table</caption><thead><tr><th>Club</th><th class="n">P</th><th class="n">W</th><th class="n">L</th><th class="n">D</th><th class="n">For</th><th class="n">Against</th><th class="n">Pts</th></tr></thead><tbody>';
  rw.forEach(r=>h+='<tr><td><a href="#/club/'+r.id+'">'+esc(r.n)+'</a></td><td class="n">'+r.p+'</td><td class="n g">'+r.w+
    '</td><td class="n w">'+r.l+'</td><td class="n">'+r.d+'</td><td class="n">'+r.f+'</td><td class="n">'+r.a+'</td><td class="n"><b>'+(r.w*2+r.d)+"</b></td></tr>");
  return h+"</tbody></table></div>";
}
function vHome(){
  const cs=curiosities().slice(0,3), ms=(L.matches||[]).slice(-1);
  let h='<h1 class="page">'+esc(L.season)+'</h1>';
  h+='<div class="lede">'+md(PAGES["home"]||"")+"</div>";
  h+=tblLadder();
  if(ms.length){ const m=ms[0];
    h+='<h2 class="sec">Latest result</h2><p><b>'+esc(team(m.teams[0]).name)+" v "+esc(team(m.teams[1]).name)+
       '</b><br>'+esc(m.result?m.result.text:"")+' &nbsp;·&nbsp; <a href="#/match/'+esc(m.id)+'">full scorecard</a></p>'; }
  if(cs.length){ h+='<h2 class="sec">Statistically true, and nobody asked</h2>';
    cs.forEach(f=>h+='<div class="fact"><p>'+esc(f.t)+'</p><div class="d">'+esc(f.d)+"</div></div>");
    h+='<p style="margin-top:16px"><a href="#/curiosities">Every one of them</a></p>'; }
  return h;
}
function vResults(){
  const ms=(L.matches||[]).slice().reverse();
  let h='<h1 class="page">'+esc(navTitle("results","Results"))+'</h1>';
  if(!ms.length) return h+'<div class="empty">Nothing played yet.</div>';
  h+='<div class="tw"><table><thead><tr><th>Round</th><th>Fixture</th><th>Result</th><th></th></tr></thead><tbody>';
  ms.forEach(m=>h+="<tr><td>"+esc(m.round)+"</td><td>"+esc(team(m.teams[0]).name)+" v "+esc(team(m.teams[1]).name)+
    "</td><td>"+esc(m.result?m.result.text:"")+'</td><td><a href="#/match/'+esc(m.id)+'">scorecard</a></td></tr>');
  return h+"</tbody></table></div>";
}
function vMatch(id){
  const m=(L.matches||[]).find(x=>x.id===id); if(!m) return '<div class="empty">No such fixture.</div>';
  let h='<h1 class="page">'+esc(team(m.teams[0]).name)+" v "+esc(team(m.teams[1]).name)+"</h1>";
  h+='<p class="lede">'+esc(m.round)+" · "+esc(m.date)+(m.followOn?" · follow-on enforced":"")+"<br><b>"+esc(m.result?m.result.text:"")+"</b></p>";
  m.innings.forEach((inn,i)=>{
    const t=team(inn.team);
    h+='<div class="tw"><table><caption>'+esc(t.name)+" · "+["first","second","third","fourth"][i]+" innings · "+inn.total+" for "+inn.wkts+"</caption>"+
      "<thead><tr><th>Batter</th><th>How out</th><th>Bowler</th><th class='n'>R</th><th class='n'>B</th></tr></thead><tbody>";
    inn.card.forEach(c=>{ if(!c.balls&&!c.out) return;
      h+='<tr><td><a href="#/player/'+slug(c.name)+'">'+esc(c.name)+'</a></td><td class="'+(c.out?"w":"g")+'">'+esc(c.out||"not out")+
         "</td><td>"+esc(c.by||"")+"</td><td class='n'>"+c.runs+"</td><td class='n'>"+c.balls+"</td></tr>"; });
    h+="<tr class='tot'><td>Total</td><td>"+inn.wkts+" wickets</td><td></td><td class='n'>"+inn.total+"</td><td class='n'>"+inn.balls+"</td></tr></tbody></table></div>";
  });
  return h;
}
function vClubs(){
  let h='<h1 class="page">'+esc(navTitle("clubs","Clubs"))+'</h1><div class="grid">';
  L.teams.forEach(t=>h+='<a class="card" href="#/club/'+t.id+'"><h3>'+esc(t.name)+'</h3><span class="m">'+esc(t.short)+" · "+t.players.length+" players</span></a>");
  return h+"</div>";
}
function vClub(id){
  const t=team(id); if(!t) return '<div class="empty">No such club.</div>';
  const c=careers(rows()).bat;
  let h='<h1 class="page">'+esc(t.name)+'</h1><div class="tw"><table><caption>Squad</caption><thead><tr><th>Player</th><th class="n">R</th><th class="n">B</th><th class="n">Outs</th><th class="n">Avg</th><th class="n">HS</th></tr></thead><tbody>';
  t.players.forEach(p=>{ const x=c.find(y=>y.name===p.name)||{runs:0,balls:0,outs:0,hs:0};
    h+='<tr><td><a href="#/player/'+slug(p.name)+'">'+esc(p.name)+'</a></td><td class="n">'+x.runs+'</td><td class="n">'+x.balls+
       '</td><td class="n">'+x.outs+'</td><td class="n">'+(x.outs?r1(x.runs/x.outs):"—")+'</td><td class="n">'+x.hs+"</td></tr>"; });
  return h+"</tbody></table></div>";
}
function vPlayer(name){
  const rs=rows(), c=careers(rs);
  let p=null,t=null;
  for(const tt of L.teams){ const f=tt.players.find(x=>x.name===name); if(f){p=f;t=tt;break;} }
  if(!p) return '<div class="empty">No such player.</div>';
  const b=c.bat.find(x=>x.name===name)||{runs:0,balls:0,outs:0,hs:0,app:0,surv:0};
  const w=c.bowl.find(x=>x.name===name)||{wkts:0,balls:0,conc:0};
  let h='<h1 class="page">'+esc(p.name)+'</h1><p class="lede">'+esc(t.name)+"</p>";
  h+='<div class="kpi">'+
    '<div><b>'+b.runs+'</b><span>runs</span></div>'+
    '<div><b>'+(b.outs?r1(b.runs/b.outs):"—")+'</b><span>average</span></div>'+
    '<div><b>'+b.hs+'</b><span>highest</span></div>'+
    '<div><b>'+b.balls+'</b><span>balls faced</span></div>'+
    '<div><b>'+b.surv+"/"+b.app+'</b><span>appeals survived</span></div>'+
    '<div><b>'+w.wkts+'</b><span>wickets</span></div>'+
    '<div><b>'+(w.wkts?r1(w.conc/w.wkts):"—")+'</b><span>bowling avg</span></div></div>';
  h+='<div class="tags">'+Object.entries(p.tags||{}).map(e=>"<span>"+esc(e[0])+": "+esc(e[1])+"</span>").join("")+"</div>";
  const inns=[];
  for(const m of L.matches||[]) m.innings.forEach((inn,i)=>{ const cc=(inn.card||[]).find(x=>x.name===name);
    if(cc&&(cc.balls||cc.out)) inns.push({m,i,c:cc}); });
  if(inns.length){
    h+='<h2 class="sec">Every innings</h2><div class="tw"><table><thead><tr><th>Fixture</th><th>Inns</th><th>How out</th><th class="n">R</th><th class="n">B</th></tr></thead><tbody>';
    inns.forEach(x=>h+='<tr><td><a href="#/match/'+esc(x.m.id)+'">'+esc(team(x.m.teams[0]).short)+" v "+esc(team(x.m.teams[1]).short)+
      "</a></td><td>"+(x.i+1)+'</td><td class="'+(x.c.out?"w":"g")+'">'+esc(x.c.out||"not out")+'</td><td class="n">'+x.c.runs+'</td><td class="n">'+x.c.balls+"</td></tr>");
    h+="</tbody></table></div>";
  } else h+='<div class="empty" style="margin-top:20px">Has not yet batted in this competition.</div>';
  return h;
}
function vRecords(){
  const c=careers(rows());
  if(!c.bat.length) return '<h1 class="page">'+esc(navTitle("records","Records"))+'</h1><div class="empty">The record book opens with the first ball of the season.</div>';
  const bat=c.bat.slice().sort((a,b)=>b.runs-a.runs), bowl=c.bowl.slice().sort((a,b)=>b.wkts-a.wkts||a.conc-b.conc);
  let h='<h1 class="page">'+esc(navTitle("records","Records"))+'</h1>';
  h+='<div class="tw"><table><caption>Batting</caption><thead><tr><th>Batter</th><th class="n">R</th><th class="n">B</th><th class="n">Outs</th><th class="n">Avg</th><th class="n">HS</th><th class="n">Appeals</th><th class="n">Survived</th></tr></thead><tbody>';
  bat.forEach(x=>h+='<tr><td><a href="#/player/'+slug(x.name)+'">'+esc(x.name)+'</a></td><td class="n">'+x.runs+'</td><td class="n">'+x.balls+
    '</td><td class="n">'+x.outs+'</td><td class="n">'+(x.outs?r1(x.runs/x.outs):"—")+'</td><td class="n">'+x.hs+'</td><td class="n">'+x.app+'</td><td class="n g">'+x.surv+"</td></tr>");
  h+="</tbody></table></div>";
  h+='<div class="tw"><table><caption>Bowling</caption><thead><tr><th>Bowler</th><th class="n">W</th><th class="n">B</th><th class="n">Conceded</th><th class="n">Avg</th></tr></thead><tbody>';
  bowl.forEach(x=>h+='<tr><td><a href="#/player/'+slug(x.name)+'">'+esc(x.name)+'</a></td><td class="n w">'+x.wkts+'</td><td class="n">'+x.balls+
    '</td><td class="n">'+x.conc+'</td><td class="n">'+(x.wkts?r1(x.conc/x.wkts):"—")+"</td></tr>");
  return h+"</tbody></table></div>";
}
function vCur(){
  const cs=curiosities();
  let h='<h1 class="page">'+esc(navTitle("curiosities","Curiosities"))+'</h1><p class="lede">Every line below is true, derived from the actual rolls, and of no use to anybody.</p>';
  if(!cs.length) return h+'<div class="empty">The engine needs about two completed fixtures before the cohorts mean anything.</div>';
  cs.forEach(f=>h+='<div class="fact"><p>'+esc(f.t)+'</p><div class="d">'+esc(f.d)+"</div></div>");
  return h;
}
function vEps(){
  let h='<h1 class="page">'+esc(navTitle("episodes","Episodes"))+'</h1>';
  if(!EPS.length) return h+'<div class="empty">No episodes listed yet. Add them in <code>episodes.json</code>.</div>';
  h+='<ul class="eps">';
  EPS.forEach(e=>h+='<li><span class="n">'+esc(e.number)+'</span><a href="'+esc(e.url)+'" rel="noopener">'+esc(e.title)+
    '</a><span class="muted small">'+esc(e.date||"")+"</span></li>");
  return h+"</ul>";
}
function vPage(file){
  const src=PAGES[file];
  if(src==null) return '<div class="empty">No page called <code>'+esc(file)+'.md</code> in the repository root.</div>';
  return '<article class="prose">'+md(src)+"</article>";
}
function route(){
  const p=(location.hash||"#/").replace(/^#\/?/,"").split("/").map(decodeURIComponent);
  const k=p[0]||"";
  const active=k==="p"?("p/"+p[1]):k;
  document.querySelectorAll("nav.main a").forEach(a=>a.classList.toggle("on",a.dataset.k===active));
  const v=k===""?vHome():k==="results"?vResults():k==="match"?vMatch(p[1]):k==="clubs"?vClubs():
          k==="club"?vClub(p[1]):k==="player"?vPlayer(p[1]):k==="records"?vRecords():
          k==="curiosities"?vCur():k==="episodes"?vEps():k==="p"?vPage(p[1]):vHome();
  $("#view").innerHTML=v;
  window.scrollTo(0,0);
}
const grab=async(u,d)=>{ try{ const r=await fetch(u,{cache:"no-store"});
  if(!r.ok) throw 0; return u.endsWith(".json")?await r.json():await r.text(); }catch(e){ return d; } };
async function start(){
  SITE=await grab("site.json",SITE);
  for(const n of SITE.nav||[]) if(n.type==="page") PAGES[n.file]=await grab(""+n.file+".md","");
  PAGES["home"]=await grab("home.md","");
  $(".brand").textContent=SITE.name||"Dice Cricket";
  document.title=SITE.name||"Dice Cricket";
  $("#foot").innerHTML=md(SITE.footer||"");
  $("nav.main").innerHTML=(SITE.nav||[]).map(n=>{ const k=navKey(n);
    return '<a href="#/'+k+'" data-k="'+esc(k)+'">'+esc(n.title)+"</a>"; }).join("");
  L=await grab("league.json",null);
  if(!L){ $("#view").innerHTML='<div class="empty">Could not load <code>league.json</code>.</div>'; return; }
  EPS=await grab("episodes.json",[]);
  L.matches=L.matches||[];
  $("#seasonSub").textContent=(L.season||"")+(L.generated?" · updated "+L.generated:"");
  if(L.demo){ const b=document.createElement("div"); b.className="demo";
    b.textContent="Demonstration data. This season was simulated to show the site working. Replace league.json with your first real export and this notice disappears.";
    $("nav.main").after(b); }
  addEventListener("hashchange",route); route();
}
start();
