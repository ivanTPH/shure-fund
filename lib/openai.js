export async function runAgent(systemPrompt, userInput) {
  return {
    message: "Agent system connected successfully",
    input: userInput
  };
}
EOFcat > lib/openai.js <<'EOF'
export async function runAgent(systemPrompt, userInput) {
  return {
    message: "Agent system connected successfully",
    input: userInput
  };
}
