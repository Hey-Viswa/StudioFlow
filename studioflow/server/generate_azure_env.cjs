const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Path to your .env file
const envPath = path.join(__dirname, '.env');

try {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));

    // Existing Azure variables (Docker credentials)
    const azureVars = [
        {
            "name": "DOCKER_REGISTRY_SERVER_PASSWORD",
            "value": "zvynUWGlB0Lq68mnFbX/KZ0hrBymMW6uqxkKXcsvdL+ACRDcfTAn",
            "slotSetting": false
        },
        {
            "name": "DOCKER_REGISTRY_SERVER_URL",
            "value": "studioflowregistry.azurecr.io",
            "slotSetting": false
        },
        {
            "name": "DOCKER_REGISTRY_SERVER_USERNAME",
            "value": "studioflowregistry",
            "slotSetting": false
        },
        {
            "name": "WEBSITES_ENABLE_APP_SERVICE_STORAGE",
            "value": "false",
            "slotSetting": false
        },
        {
            "name": "WEBSITES_PORT",
            "value": "3000",
            "slotSetting": false
        }
    ];

    // Merge .env variables
    for (const k in envConfig) {
        // Only add if not already in the list
        if (!azureVars.find(v => v.name === k)) {
            azureVars.push({
                name: k,
                value: envConfig[k],
                slotSetting: false
            });
        }
    }

    console.log(JSON.stringify(azureVars, null, 2));
    console.log('\n\nSUCCESS! Copy the JSON above and paste it into "Advanced Edit" in Azure Portal.');

} catch (e) {
    console.error("Error reading .env file:", e.message);
}
