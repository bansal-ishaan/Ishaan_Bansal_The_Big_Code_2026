// background.js

chrome.action.onClicked.addListener(async (tab) => {
    console.log("Extension icon clicked. Messaging content script...");

    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: "extract_dom" });
        
        if (response) {
            console.log("DOM Extraction Successful!");
            console.log("Page Title:", response.title);
            console.log("Elements Extracted for LLM:", response.contentMap.length);
            
            // Log the first 3 elements so we can see the data structure
            console.log("Text Mapping Preview:", response.contentMap.slice(0, 3));
            
            // TODO: We will stringify `response.contentMap` as JSON and send it to Claude AI here
        }
    } catch (error) {
        console.error("Error communicating with content script. Make sure the page is fully loaded.", error);
    }
});
