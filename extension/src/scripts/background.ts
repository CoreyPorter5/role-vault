/// <reference types="chrome" />

async function getAuthToken(): Promise<string | null> {
    try {
        const cookie = await chrome.cookies.get({
            url: "http://localhost:3000",
            name: "sb-njtsnlwxgxahbzjdkjvr-auth-token"
        });

        if (!cookie) {
            return null
        }

        let decodedValue = decodeURIComponent(cookie.value);
        if (decodedValue.startsWith("base64-")) {
            const b64Data = decodedValue.replace("base64-", "");
            decodedValue = atob(b64Data);
        }
        const parsed = JSON.parse(decodedValue);


        if (Array.isArray(parsed)) {
            return parsed[0]
        } else if (parsed && parsed.access_token) {
            return parsed.access_token;
        }
        return null

    } catch (e) {
        console.error("Failed to parse Supabase cookie:", e)
        return null
    }

}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "SYNC_JOB") {

        (async () => {

            try {

                const token = await getAuthToken();
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
    if (request.action === "GET_TOKEN") {
        getAuthToken().then(token => {
            sendResponse({token: token});
        });
        return true;



    }

})

