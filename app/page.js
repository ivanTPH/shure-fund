"use client";

import { useState } from "react";

export default function Home() {
  const [data, setData] = useState(null);

  const loadAgent = async () => {
    const res = await fetch("/api/agent?id=compliance");
    const json = await res.json();
    setData(json);
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>Shure Fund 🚀</h1>
      <button onClick={loadAgent}>Load Compliance Agent</button>

      {data && (
        <pre style={{ marginTop: 20 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}
