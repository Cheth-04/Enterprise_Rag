(function () {

const STORAGE_KEY="rag_history_v1";

if(document.getElementById("rag-chatbot")){
    return;
}

document.body.insertAdjacentHTML("beforeend",`

<div id="rag-chatbot">

    <div id="rag-header">

        <span>Enterprise Assistant</span>

        <button id="rag-minimize">−</button>

    </div>

    <div id="rag-body">

        <div id="rag-messages"></div>

        <div id="rag-input-row">

            <input
                id="rag-input"
                placeholder="Ask a question..."
            >

            <button id="rag-send">
                Send
            </button>

        </div>

    </div>

</div>

`);

const chatbot=document.getElementById("rag-chatbot");
const body=document.getElementById("rag-body");
const minimizeBtn=document.getElementById("rag-minimize");
const messages=document.getElementById("rag-messages");
const input=document.getElementById("rag-input");
const sendBtn=document.getElementById("rag-send");


function loadHistory(){

try{
return JSON.parse(
localStorage.getItem(STORAGE_KEY)
)||[];
}
catch{
return[];
}

}


function saveHistory(data){

localStorage.setItem(
STORAGE_KEY,
JSON.stringify(data)
);

}


function saveMessage(text,type){

const data=loadHistory();

data.push({
text,
type
});

saveHistory(data);

}


function appendMessage(text,type){

const div=
document.createElement("div");

div.className=
"rag-message "+type;

div.textContent=text;

messages.appendChild(div);

messages.scrollTop=
messages.scrollHeight;

return div;

}



function renderHistory(){

const data=
loadHistory();

if(data.length===0){

appendMessage(
"Hello 👋 Upload documents and ask questions.",
"rag-bot"
);

saveMessage(
"Hello 👋 Upload documents and ask questions.",
"rag-bot"
);

return;

}

data.forEach(x=>{

appendMessage(
x.text,
x.type
);

});

}


renderHistory();



minimizeBtn.onclick=()=>{

if(
body.style.display==="none"
){

body.style.display="flex";

chatbot.style.height=
"600px";

minimizeBtn.innerHTML=
"−";

}
else{

body.style.display=
"none";

chatbot.style.height=
"78px";

minimizeBtn.innerHTML=
"+";

}

};



async function sendMessage(){

const question=
input.value.trim();

if(!question){
return;
}

appendMessage(
question,
"rag-user"
);

saveMessage(
question,
"rag-user"
);

input.value="";


const botMsg=
appendMessage(
"",
"rag-bot"
);


try{

const response=
await fetch(
"/chat-stream",
{
method:"POST",

headers:{
"Content-Type":
"application/json"
},

body:
JSON.stringify({
question
})

}
);



if(!response.body){

botMsg.textContent=
"Streaming unavailable";

return;

}


const reader=
response.body.getReader();

const decoder=
new TextDecoder();

let full="";


while(true){

const{
done,
value
}
=
await reader.read();

if(done)
break;

full+=
decoder.decode(
value,
{
stream:true
}
);

botMsg.textContent=
full;

messages.scrollTop=
messages.scrollHeight;

}


saveMessage(
full,
"rag-bot"
);

}
catch(e){

botMsg.textContent=
"Unable to reach RAG service";

console.log(e);

}

}



sendBtn.onclick=
sendMessage;


input.addEventListener(
"keydown",
e=>{

if(
e.key==="Enter"
){
sendMessage();
}

}
);


})();
