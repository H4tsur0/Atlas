const BACKEND_URL = "https://atlas-backend.yoursubdomain.workers.dev";

document.addEventListener("DOMContentLoaded", () => {
    fetchBriefing();
});

async function fetchBriefing() {
    const container = document.getElementById("articlesContainer");
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/dashboard/brief`);
        if (!response.ok) throw new Error("Pipeline delivery failed.");
        
        const data = await response.json();
        
        // Wipe away the loader text
        container.innerHTML = "";
        
        // Loop and paint the elements directly into the HTML context
        data.briefing.forEach(article => {
            const card = document.createElement("div");
            card.className = "brief-card";
            
            card.innerHTML = `
                <div class="brief-meta">${article.source_name} // Conf. Score: ${(article.confidence_score * 100).toFixed(0)}%</div>
                <h2>${article.title}</h2>
                <p class="brief-summary">${article.ai_summary}</p>
            `;
            
            container.appendChild(card);
        });
        
    } catch (error) {
        container.innerHTML = `<p style="color: var(--accent-color); font-family: monospace;">[CRITICAL ERROR] ${error.message}</p>`;
    }
}