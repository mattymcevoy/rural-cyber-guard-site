// Minimal test function: api/chat/index.js

module.exports = async function (context, req) {
  context.log("RCG chat function hit");

  const method = req.method || "GET";
  let userMessage = "";

  if (method === "POST") {
    const body = req.body || {};
    userMessage = body.message || "(no message provided)";
  } else {
    userMessage = "(GET request – no message body)";
  }

  context.res = {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: {
      reply: `Test OK from Azure Functions. Method: ${method}. You said: "${userMessage}".`
    }
  };
};
