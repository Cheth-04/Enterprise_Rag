(function () {

  const chatbotHTML = `

    <div id="rag-chatbot">

      <div id="rag-header">Enterprise Knowledge Assistant</div>


      <div id="rag-messages">

        <div class="rag-message rag-bot">

          Hello. Ask me questions from the indexed documents.

        </div>

      </div>


      <div id="rag-input-row">

        <input

          id="rag-input"

          type="text"

          placeholder="Ask a question..."

        />

        <button id="rag-send">Send</button>

      </div>

    </div>

  `;


  document.body.insertAdjacentHTML("beforeend", chatbotHTML);


  const input = document.getElementById("rag-input");

  const sendButton = document.getElementById("rag-send");

  const messages = document.getElementById("rag-messages");


  async function sendMessage() {

    const question = input.value.trim();


    if (!question) return;


    addMessage(question, "rag-user");

    input.value = "";


    const thinkingNode = addMessage("Thinking...", "rag-bot");


    try {

      const response = await fetch("http://192.168.1.41:8010/chat", {

        method: "POST",

        headers: {

          "Content-Type": "application/json"

        },

        body: JSON.stringify({ question })

      });


      const data = await response.json();

      thinkingNode.remove();


      let sourceText = "";


      if (data.sources && data.sources.length > 0) {

        const sourceNames = [

          ...new Set(data.sources.map(source => source.filename))

        ];


        sourceText = `

Sources used: ${sourceNames.join(", ")}

        `;

      }


      addMessage(

        `${data.answer || "No answer returned."}${sourceText}`,

        "rag-bot"

      );


    } catch (error) {

      thinkingNode.remove();

      addMessage(

        "Unable to connect to the RAG service.",

        "rag-bot"

      );

    }

  }


  function addMessage(text, cssClass) {

    const div = document.createElement("div");

    div.className = `rag-message ${cssClass}`;

    div.textContent = text;


    messages.appendChild(div);

    messages.scrollTop = messages.scrollHeight;


    return div;

  }


  sendButton.addEventListener("click", sendMessage);


  input.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {

      sendMessage();

    }

  });

})();
