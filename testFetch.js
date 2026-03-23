const url = "https://hdak-lib-chatbot.onrender.com/api/conversations/1/messages";
const req = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: "Привіт! Що ти вмієш?" })
};

fetch(url, req).then(async res => {
  if (!res.ok) {
    const err = await res.text();
    console.error("HTTP Error:", res.status, err);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }
  console.log("Response:", result);
}).catch(console.error);
