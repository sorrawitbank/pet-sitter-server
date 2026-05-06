import dialogflowClient, { PROJECT_ID } from "./client";
import AppError from "../../errors/AppError";

const SESSION_ID = "pet-sitter-dialogflow-session";
const GUEST_UUID = "1b9709b2-3f33-43aa-b771-38f5576017d3";

async function textQuery(query: string, languageCode: string, userId?: string) {
  const sessionPath = dialogflowClient.sessionPath(
    PROJECT_ID,
    SESSION_ID + (userId ? userId : GUEST_UUID),
  );

  let result;

  try {
    result = await dialogflowClient.detectIntent({
      session: sessionPath,
      queryInput: {
        text: {
          text: query,
          languageCode,
        },
      },
    });
  } catch (error) {
    throw new AppError(500, "Error querying Dialogflow");
  }

  return result;
}

export default textQuery;
