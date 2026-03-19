/// <reference types="chrome" />

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if(request.action === "SYNC_JOB"){
        fetch('http://localhost:8080/api/v1/users/test_user_1/jobs', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request.payload)
        })
            .then(async (response) => {
                if(response.ok){
                    sendResponse({success: true})
                    chrome.action.openPopup().catch(err =>{
                        console.error(err)
                    });
                }else{
                    const errorText = await response.text();
                    sendResponse({success: false, error: errorText})
                }
            })
            .catch(error => {
                sendResponse({success: false, error: error.message})
            })

        return true;
    }

})