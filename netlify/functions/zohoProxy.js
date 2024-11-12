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
        tokenExpiration = Date.now() + (response.data.expires_in - 300) * 1000;
        return accessToken;
    } catch (error) {
        console.error("Error fetching access token:", error.message);
        throw new Error("Could not refresh Zoho access token.");
    }
};

const fetchZohoAccount = async (accountId) => {
    if (!accessToken || Date.now() > tokenExpiration) {
        accessToken = await getAccessToken();
    }

    try {
        // Get account details
        const accountResponse = await axios.get(`https://www.zohoapis.com/crm/v2/Accounts/${accountId}`, {
            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
        });

        const accountData = accountResponse.data.data[0];

        // Fetch owner and customer success manager details
        const ownerId = accountData.Owner.id;
        const customerSuccessManagerId = accountData.Customer_Success_Manager.id;

        const [ownerResponse, csmResponse] = await Promise.all([
            axios.get(`https://www.zohoapis.com/crm/v2/users/${ownerId}`, {
                headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
            }),
            axios.get(`https://www.zohoapis.com/crm/v2/users/${customerSuccessManagerId}`, {
                headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
            })
        ]);

        // Build and return the combined data object
        return {
            accountData,
            ownerData: ownerResponse.data,
            customerSuccessManagerData: csmResponse.data
        };
    } catch (error) {
        console.error("Error fetching Zoho account or user data:", error.message);
        throw new Error("Could not fetch Zoho account or user data.");
    }
};

exports.handler = async function (event) {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "https://variphy-staging-466afaae024067fd31479fd.webflow.io",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            },
            body: "",
        };
    }

    const accountId = event.queryStringParameters.id;

    try {
        const data = await fetchZohoAccount(accountId);
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "https://variphy-staging-466afaae024067fd31479fd.webflow.io",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            },
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "https://variphy-staging-466afaae024067fd31479fd.webflow.io",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            },
            body: JSON.stringify({ message: error.message }),
        };
    }
};
