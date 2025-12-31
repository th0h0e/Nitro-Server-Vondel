import { defineHandler, readBody, setResponseHeaders } from "nitro/h3";

export default defineHandler(async (event) => {
  console.log("=== INCOMING REQUEST ===");
  console.log("Method:", event.method);
  console.log("Headers:", event.headers);
  
  // Set CORS headers to allow requests from the Vite dev server
  setResponseHeaders(event, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  console.log("CORS headers set");

  // Handle preflight OPTIONS request
  if (event.method === "OPTIONS") {
    console.log("OPTIONS request - returning empty response");
    return {};
  }

  // Only allow POST requests
  if (event.method !== "POST") {
    console.log("Method not allowed:", event.method);
    return {
      success: false,
      error: "Method not allowed. Use POST.",
    };
  }

  try {
    // Read the request body
    const body = await readBody(event);
    
    console.log("Received form submission:", body);

    // Get environment variables
    const apiToken = process.env.WEBFLOW_API_TOKEN;
    const collectionId = process.env.WEBFLOW_COLLECTION_ID;

    if (!apiToken || !collectionId) {
      throw new Error("Missing Webflow API configuration");
    }

    // Validate required fields
    if (!body.name || !body.email) {
      return {
        success: false,
        error: "Name and email are required fields",
      };
    }

    // Prepare the data for Webflow CMS
    const cmsData = {
      fieldData: {
        name: body.name,
        email: body.email,
        phone: body.phone || "",
        message: body.message || "",
      }
    };

    console.log("Creating Webflow CMS item:", cmsData);

    // Call Webflow API to create the item
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify(cmsData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Webflow API error:", errorData);
      throw new Error(`Webflow API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log("Webflow CMS item created:", result);

    return {
      success: true,
      message: "Form submitted successfully",
      itemId: result.id,
    };
  } catch (error) {
    console.error("Error processing form:", error);
    
    return {
      success: false,
      error: error.message || "Failed to process form submission",
    };
  }
});
