import { POST } from "./src/app/api/analyze/create/route";

async function run() {
  const req = new Request("http://localhost:3000/api/analyze/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Я" }),
  });

  try {
    const res = await POST(req);
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Test failed", e);
  }
}

run();
