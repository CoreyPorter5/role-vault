export async function createStripeCheckoutSession(token: string | null)  {
    if(!token){
        console.error("Error: You need to be logged in");
        return
    }
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/billing/create-checkout-session`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        })
        if(!response.ok){
            const error = await response.text();
            console.error("Failed to create checkout session: ", error)
            return
        }

        const data: {url: string} = await response.json();
        if(!data.url){
            console.error("No redirect URL returned from backend")
            return
        }
        window.location.href = data.url
    }catch (error){
        console.log("Error creating stripe checkout session: ", error)
    }
}




