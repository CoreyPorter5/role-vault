/// <reference types="chrome" />

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "SYNC_JOB") {

        (async () => {

            try {
                const cookie = await chrome.cookies.get({
                    url: "http://localhost:3000",
                    name: "sb-njtsnlwxgxahbzjdkjvr-auth-token"
                });


                if (!cookie) {
                    sendResponse({success: false, error: "Not logged in to SeekSnc"});
                    return
                }
                let token = cookie.value;
                try {
                    const parsed = JSON.parse(decodeURIComponent(cookie.value));
                    if (Array.isArray(parsed)) {
                        token = parsed[0]
                    }
                } catch { /* empty */ }

                const response = await fetch('http://localhost:8080/api/v1/jobs', {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(request.payload)
                })
                if (response.ok) {
                    sendResponse({success: true});
                    chrome.action.openPopup().catch(err => console.error(err));
                } else {
                    const errorText = await response.text();
                    sendResponse({success: false, status: response.status, error: errorText});
                }


            } catch (error: unknown) {
                console.error("Sync Error: ", error);
                sendResponse({success: false, error: "Unknown error"})
            }


        })();


        return true;
    }

})