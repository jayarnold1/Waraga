

let isAdmin = false;
let pages = JSON.parse(localStorage.getItem("pages")) || [];
let currentPage = null;

const editor = document.getElementById("editor");
const titleInput = document.getElementById("page-title");
const sound = document.getElementById("forestSound");

function save(){ localStorage.setItem("pages", JSON.stringify(pages)); }

function renderPages(){
  const list = document.getElementById("page-list");
  list.innerHTML="";
  pages.forEach((p,i)=>{
    if(!p.published && !isAdmin) return;
    const li=document.createElement("li");
    li.innerText=p.title;
    li.onclick=()=>openPage(i);
    list.appendChild(li);
  });
}

function addPage(){
  if(!isAdmin) return;
  pages.push({title:"Untitled",content:"",published:false});
  save(); renderPages();
}

function openPage(i){
  currentPage=i;
  titleInput.value=pages[i].title;
  editor.innerHTML=pages[i].content;
}

function deletePage(){
  if(!isAdmin) return;
  pages.splice(currentPage,1);
  save(); renderPages(); editor.innerHTML="";
}

function publishPage(){
  if(!isAdmin) return;
  pages[currentPage].published=true;
  save();
}

function login(){
  if(prompt("pass") === "admin123"){
    isAdmin=true;
    editor.contentEditable=true;
  }
}

function logout(){
  isAdmin=false;
  editor.contentEditable=false;
}

function uploadMedia(){
  if(!isAdmin) return;
  fileInput.click();
}

fileInput.onchange = function(){
  const file=this.files[0];
  const reader=new FileReader();
  reader.onload=e=>{
    const img=document.createElement("img");
    img.src=e.target.result;
    img.className="draggable";
    img.style.width="200px";
    img.onmousedown=drag;
    editor.appendChild(img);
  };
  reader.readAsDataURL(file);
};

function drag(e){
  let el=e.target;
  let shiftX=e.clientX-el.getBoundingClientRect().left;
  let shiftY=e.clientY-el.getBoundingClientRect().top;

  function moveAt(pageX,pageY){
    el.style.left=pageX-shiftX+'px';
    el.style.top=pageY-shiftY+'px';
  }

  function onMouseMove(e){ moveAt(e.pageX,e.pageY); }
  document.addEventListener('mousemove', onMouseMove);

  el.onmouseup=function(){ document.removeEventListener('mousemove', onMouseMove); };
}

function toggleMode(){ document.body.classList.toggle("light"); }

function toggleSound(){
  if(sound.paused) sound.play(); else sound.pause();
}

setInterval(()=>{
  if(isAdmin && currentPage!=null){
    pages[currentPage].content=editor.innerHTML;
    pages[currentPage].title=titleInput.value;
    save();
  }
},1000);

renderPages();