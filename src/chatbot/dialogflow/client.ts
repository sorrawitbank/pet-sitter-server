import "dotenv/config";
import dialogflow from "dialogflow";

export const PROJECT_ID = "gen-lang-client-0552269893";
const CLIENT_EMAIL =
  "pet-sitter-dialogflow@gen-lang-client-0552269893.iam.gserviceaccount.com";

if (!process.env.DIALOGFLOW_PRIVATE_KEY_ID) {
  console.error(
    "DIALOGFLOW_PRIVATE_KEY_ID is not set in environment variables",
  );
  throw new Error(
    "DIALOGFLOW_PRIVATE_KEY_ID is not set in environment variables.",
  );
}

if (!process.env.DIALOGFLOW_PRIVATE_KEY) {
  console.error("DIALOGFLOW_PRIVATE_KEY is not set in environment variables");
  throw new Error(
    "DIALOGFLOW_PRIVATE_KEY is not set in environment variables.",
  );
}

const dialogflowClient = new dialogflow.SessionsClient({
  projectId: PROJECT_ID,
  credentials: {
    client_email: CLIENT_EMAIL,
    private_key: process.env.DIALOGFLOW_PRIVATE_KEY,
  },
});

export default dialogflowClient;
