export async function aiImprove(client, original, instructions) {
    const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `You are a precise MCP code improvement agent.
Return full valid JavaScript source — same code, improved doc only.
Never change logic, add one JSDoc header if missing.
No markdown, no commentary.`
            },
            {
                role: "user",
                content: `File content:\n\n${original}\n\nInstruction:\n${instructions}`
            }
        ]
    });

    let improved = completion.choices?.[0]?.message?.content?.trim() || "";
    improved = improved.replace(/^```[\s\S]*?\n/, "").replace(/```$/, "").trim();
    return improved;
}
