const $=(s,c=document)=>c.querySelector(s);const $$=(s,c=document)=>[...c.querySelectorAll(s)];
window.addEventListener('load',()=>setTimeout(()=>$('#boot').classList.add('done'),1050));
$('#year').textContent=new Date().getFullYear();

const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.13});
$$('.reveal').forEach(el=>observer.observe(el));

if(!reduced){
  addEventListener('pointermove',e=>{const g=$('.cursor-glow');g.style.left=e.clientX+'px';g.style.top=e.clientY+'px'});
  $$('.magnetic').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.12}px)`});el.addEventListener('pointerleave',()=>el.style.transform='')});
}

const data={
  recon:{path:'enumeration',title:'Build the map before choosing the path.',text:'Service discovery, banner analysis, content enumeration và liên kết từng tín hiệu thành giả thuyết có thể kiểm chứng.',chips:['Nmap','ffuf','NetExec','BloodHound','Burp Suite']},
  web:{path:'web-testing',title:'Follow input, trust boundaries and state.',text:'Quan sát request/response, kiểm tra logic, xác thực và tác động trong phạm vi lab được cho phép.',chips:['Burp Suite','OWASP','SQLmap','Caido','curl']},
  ad:{path:'active-directory',title:'Identity is the modern attack surface.',text:'Tập trung vào quan hệ trust, credential exposure, delegation và đường leo quyền có thể chứng minh.',chips:['BloodHound','Impacket','NetExec','Kerbrute','PowerView']},
  linux:{path:'systems',title:'Read the host before touching the host.',text:'Phân tích permission, service, scheduled task, token và cấu hình sai trên Linux lẫn Windows.',chips:['Linux','Windows','Bash','PowerShell','WinPEAS']},
  report:{path:'reporting',title:'A finding only matters when it is understood.',text:'Ghi rõ điều kiện, bằng chứng, tác động, các bước tái hiện và hướng khắc phục theo thứ tự ưu tiên.',chips:['Evidence','Risk','Reproduce','Remediate','Retest']}
};
$$('.skill').forEach(btn=>btn.addEventListener('click',()=>{ $$('.skill').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const d=data[btn.dataset.skill],box=$('#skillDisplay');box.animate([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:280});$('.skill-display__path span',box).textContent=d.path;$('h3',box).textContent=d.title;$(':scope > p:not(.skill-display__path)',box).textContent=d.text;$('.chips',box).innerHTML=d.chips.map(x=>`<span>${x}</span>`).join('')}));

const cases=[
  {title:'Distributed Splunk & multi-source log onboarding',body:'Dựng lab Splunk Enterprise phân tán với Deployment Server và Universal Forwarders; onboard Windows Event, Sysmon, Linux, web application và firewall/syslog; kiểm tra ingestion, field extraction, dashboard, report và alert.',flow:['COLLECT','PARSE','NORMALIZE','VALIDATE']},
  {title:'Virtual lab infrastructure operations',body:'Vận hành VMware ESXi và EVE-NG/UnetLab phục vụ đào tạo kỹ thuật; hỗ trợ lab routing, switching, firewall, VPN, wireless và Cisco ISE, đồng thời duy trì tài liệu và backup.',flow:['PROVISION','MONITOR','RESTORE','DOCUMENT']},
  {title:'Offensive security case files',body:'Khu vực dành cho write-up CPTS trong tương lai. Chỉ đưa lên các lab được phép, đã làm sạch flag, credential và dữ liệu nhạy cảm; tập trung vào methodology và remediation.',flow:['ENUMERATE','FOOTHOLD','PRIVESC','REPORT']}
];
const modal=$('#caseModal');$$('.case__open').forEach(b=>b.addEventListener('click',()=>{const d=cases[+b.dataset.case];$('#modalTitle').textContent=d.title;$('#modalBody').textContent=d.body;$('#modalFlow').innerHTML=d.flow.map(x=>`<span>${x}</span>`).join('');modal.showModal()}));$('.case-modal__close').addEventListener('click',()=>modal.close());modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});

const output=$('#terminalOutput'),input=$('#terminalInput');
const commands={
  help:'AVAILABLE: about · method · labs · ethics · contact · clear',
  about:'Võ Lê Anh Tuấn · Cybersecurity student at Swinburne · IT Intern at Got It · former Security Consultant Intern at VNCS.',
  method:'01 enumerate → 02 validate → 03 exploit → 04 escalate/pivot → 05 report',
  labs:'Verified work: distributed Splunk lab + virtual lab operations. CPTS offensive case files are currently in progress.',
  ethics:'Authorization and scope come first. Evidence stays reproducible. Sensitive data stays private.',
  contact:'Võ Lê Anh Tuấn · anhtuanpm3939@gmail.com · CPTS path / no certification claims'
};
$('#terminalForm').addEventListener('submit',e=>{e.preventDefault();const raw=input.value.trim(),cmd=raw.toLowerCase();if(!raw)return;output.insertAdjacentHTML('beforeend',`<p><span class="success">guest@cpts-path:~$</span> ${escapeHtml(raw)}</p>`);if(cmd==='clear')output.innerHTML='';else if(commands[cmd])output.insertAdjacentHTML('beforeend',`<p>${commands[cmd]}</p>`);else output.insertAdjacentHTML('beforeend',`<p class="error">command not found: ${escapeHtml(cmd)} — try help</p>`);input.value='';output.scrollTop=output.scrollHeight});
function escapeHtml(v){const d=document.createElement('div');d.textContent=v;return d.innerHTML}

const canvas=$('#matrix'),ctx=canvas.getContext('2d');let w,h,drops=[];function resize(){const dpr=Math.min(devicePixelRatio,2);w=canvas.width=innerWidth*dpr;h=canvas.height=innerHeight*dpr;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);drops=Array.from({length:Math.ceil(innerWidth/28)},()=>Math.random()*-60)}function rain(){if(reduced)return;ctx.fillStyle='rgba(6,9,13,.12)';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.fillStyle='#adff2f';ctx.font='10px monospace';drops.forEach((y,i)=>{ctx.fillText(Math.random()>.5?'1':'0',i*28,y*16);drops[i]=y*16>innerHeight&&Math.random()>.975?0:y+1});requestAnimationFrame(rain)}resize();addEventListener('resize',resize);rain();
