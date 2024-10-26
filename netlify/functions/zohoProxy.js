const axios = require("axios");

let accessToken = null;
let tokenExpiration = null;

const getAccessToken = async () => {
    const clientId = "1000.MKFB9Q03GBUKB5RCRD0ZWJME8OG57M";
    const clientSecret = "e30a9f32b1f53050771c52885a016445d58eba617a";
    const refreshToken = "1000.00a28215428b9c0ebca6940d2c7abfc5.8f3a4e321ca3a8190dc881aeaef2e84d";

    try {
        const response = await axios.post(`https://accounts.zoho.com/oauth/v2/token`, null, {
            params: {
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token"
            }
        });

        // Update accessToken and expiration time
        accessToken = response.data.access_token;
        tokenExpiration = Date.now() + (response.data.expires_in - 300) * 1000; // Set token to refresh 5 min early

        return accessToken;
    } catch (error) {
        console.error("Error fetching access token:", error.message);
        throw new Error("Could not refresh Zoho access token.");
    }
};

const fetchZohoAccount = async (accountId) => {
    // Check if token is still valid; refresh if needed
    if (!accessToken || Date.now() > tokenExpiration) {
        accessToken = await getAccessToken();
    }

    try {
        // Perform the Zoho CRM API request
        const response = await axios.get(`https://www.zohoapis.com/crm/v2/Accounts/${accountId}`, {
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching Zoho account data:", error.message);
        throw new Error("Could not fetch Zoho account data.");
    }
};

exports.handler = async function (event) {
    const accountId = event.queryStringParameters.id;

    try {
        const data = await fetchZohoAccount(accountId);
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Allow all origins or set specific origin
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            },
            body: JSON.stringify({ message: error.message })
        };
    }
};
