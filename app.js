const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const CATS={
 "⚽ Sports":/\b(sport|olympic|world cup|championship|champion|football|soccer|basketball|baseball|tennis|cricket|golf|nba|nfl|fifa|race|grand prix|medal|tournament|boxing|match|league)\b/i,
 "🏛️ Politics":/\b(president|prime minister|election|elected|government|minister|parliament|congress|senate|war|treaty|independence|coup|king|queen|revolution|republic|assassinat|invade|invasion|military|summit)\b/i,
 "🚔 Crime":/\b(murder|killed|arrest|convicted|trial|robbery|hijack|kidnap|terror|bomb|shooting|massacre|prison|escape|serial|crime|attack|sentenced)\b/i,
 "⚖️ Laws":/\b(law|act|court|supreme court|constitution|legal|legislat|ban|abolish|rights|bill|ruling|amendment|treaty|signed into)\b/i,
 "💡 Inventions & Science":/\b(invent|discover|patent|launch|satellite|space|nasa|telescope|computer|internet|software|first (?:flight|successful)|scientist|vaccine|medicine|physics|technology|apollo|mission|robot|phone|web)\b/i,
 "🎬 Culture":/\b(film|movie|album|song|band|novel|book|award|oscar|grammy|premiere|television|tv|artist|music|released)\b/i,
 "🌍 Disasters":/\b(earthquake|tsunami|hurricane|flood|fire|eruption|crash|disaster|famine|storm|epidemic|pandemic|sinks|sank)\b/i
};
const $=id=>document.getElementById(id);
let data={day:[],month:[],year:[]},scope="day",cat="All";

for(let i=1;i<=31;i++)$("day").add(new Option(i,i));
MONTHS.forEach((m,i)=>$("month").add(new Option(m,i+1)));
$("year").max=new Date().getFullYear();

const cats=t=>{const r=Object.keys(CATS).filter(k=>CATS[k].test(t));return r.length?r:["📰 Other"]};
const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

async function getJSON(u){const r=await fetch(u);if(!r.ok)throw new Error(r.status);return r.json()}

async function yearLines(title,y,m){
 try{
  const j=await getJSON("https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&origin=*&redirects=1&titles="+encodeURIComponent(title));
  const p=Object.values(j.query.pages)[0];if(!p.extract)return[];
  const re=new RegExp("^("+MONTHS.join("|")+")\\s+(\\d{1,2})?(?:\\s*[–-]\\s*\\d{1,2})?\\s*[–—:-]\\s*(.+)$");
  const out=[];
  for(const l of p.extract.split("\n")){
   const x=l.trim().match(re);
   if(x)out.push({month:MONTHS.indexOf(x[1])+1,day:+x[2]||0,text:x[3],src:title});
  }
  return out;
 }catch(e){return[]}
}

$("f").addEventListener("submit",async e=>{
 e.preventDefault();
 const d=+$("day").value,m=+$("month").value,y=+$("year").value;
 if(!y||y<1){$("status").textContent="Enter a valid year.";return}
 if(d>new Date(y,m,0).getDate()){$("status").textContent="That date doesn't exist.";return}
 $("status").textContent="Searching history…";$("out").innerHTML="";
 try{
  const pad=n=>String(n).padStart(2,"0");
  const [otd,a,b,c]=await Promise.all([
   getJSON(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${pad(m)}/${pad(d)}`),
   yearLines(String(y),y,m),yearLines(y+" in sports",y,m),yearLines(y+" in science",y,m)
  ]);
  const yl=[...a,...b,...c];
  const dayItems=[];
  for(const k of ["events","births","deaths"])for(const i of otd[k]||[])
   dayItems.push({year:i.year,text:i.text,kind:k,exact:i.year===y});
  (otd.holidays||[]).forEach(h=>dayItems.push({year:"",text:h.text,kind:"holiday",exact:false}));
  data.day=dayItems.sort((p,q)=>(q.exact-p.exact)||((q.year||0)-(p.year||0)));
  data.month=yl.filter(i=>i.month===m).map(i=>({year:y,text:`${MONTHS[m-1]} ${i.day||""}: ${i.text}`,kind:i.src,exact:i.day===d}));
  data.year=yl.map(i=>({year:y,text:`${MONTHS[i.month-1]} ${i.day||""}: ${i.text}`,kind:i.src,exact:false}));
  const ex=data.day.filter(i=>i.exact).length;
  $("status").textContent=`${d} ${MONTHS[m-1]} ${y}: ${ex} exact-day items, ${data.month.length} this month, ${data.year.length} this year.`;
  $("tabs").hidden=false;scope="day";cat="All";render();
 }catch(err){$("status").textContent="Could not load data. Check your internet connection."}
});

document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>{scope=b.dataset.scope;cat="All";render()});

function render(){
 document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.scope===scope));
 const items=data[scope];
 const present=new Set();items.forEach(i=>cats(i.text).forEach(c=>present.add(c)));
 const nav=$("cats");nav.hidden=false;nav.innerHTML="";
 ["All",...present].forEach(c=>{const b=document.createElement("button");b.textContent=c;
  b.className=c===cat?"on":"";b.onclick=()=>{cat=c;render()};nav.appendChild(b)});
 const list=items.filter(i=>cat==="All"||cats(i.text).includes(cat));
 if(!list.length){$("out").innerHTML="<p class='item'>No items found for this selection.</p>";return}
 const label={events:"Event",births:"Birth",deaths:"Death",holiday:"Holiday"};
 $("out").innerHTML=(scope==="day"&&list.some(i=>i.exact)?"<h2>⭐ Happened in your exact birth year</h2>":"")+
  list.map((i,n)=>{
   const sep=scope==="day"&&n>0&&list[n-1].exact&&!i.exact?"<h2>On this day in other years</h2>":"";
   return sep+`<div class="item">${i.year?`<b>${i.year}</b> — `:""}${esc(i.text)}${label[i.kind]?`<span class="tag">${label[i.kind]}</span>`:""}</div>`}).join("");
}
