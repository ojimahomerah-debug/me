const thread = document.getElementById("thread");
const hero = document.getElementById("hero");
const form = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");

const MARK = `<svg class="avatar" viewBox="0 0 40 40" aria-hidden="true"><circle cx="15" cy="20" r="11" class="m1"/><circle cx="25" cy="20" r="11" class="m2"/></svg>`;
let messages = [];
let busy = false;

function md(text) {
  return DOMPurify.sanitize(marked.parse(text, { breaks: true }), { ADD_ATTR: ["target"] });
}

function addMessage(role, html, extraClass = "") {
  const el = document.createElement("div");
  el.className = `msg ${role} ${extraClass}`.trim();
  el.innerHTML = role === "ai" ? `${MARK}<div class="body">${html}</div>` : `<div class="body"></div>`;
  thread.appendChild(el);
  thread.scrollTop = thread.scrollHeight;
  return el;
}

function addSources(el, sources) {
  if (!sources || !sources.length) return;
  const wrap = document.createElement("div");
  wrap.className = "sources";
  sources.forEach((s) => {
    const a = document.createElement("a");
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.title = s.title;
    a.textContent = s.title;
    wrap.appendChild(a);
  });
  el.querySelector(".body").appendChild(wrap);
}

async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  sendBtn.disabled = true;
  hero?.remove();

  messages.push({ role: "user", content: text });
  addMessage("user", "").querySelector(".body").textContent = text;
  input.value = "";
  resize();

  const pending = addMessage("ai", `<span class="thinking" role="status" aria-label="Our Ai is thinking"><i></i><i></i></span>`);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Something went wrong.");

    messages.push({ role: "assistant", content: data.reply });
    pending.querySelector(".body").innerHTML = md(data.reply);
    pending.querySelectorAll(".body a").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
    addSources(pending, data.sources);
  } catch (err) {
    messages.pop(); // let the person retry the same message
    pending.classList.add("error");
    pending.querySelector(".body").textContent = `${err.message} Edit your message and send it again.`;
    input.value = text;
    resize();
  } finally {
    busy = false;
    sendBtn.disabled = false;
    thread.scrollTop = thread.scrollHeight;
    input.focus();
  }
}

function resize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
}

form.addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
input.addEventListener("input", resize);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(input.value); }
});

document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => send(c.textContent)));
["newChat", "newChatTop"].forEach((id) => document.getElementById(id).addEventListener("click", () => location.reload()));
input.focus();
