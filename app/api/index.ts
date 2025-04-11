import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import { Queues } from "../sqs";

const sqs = new aws.sdk.SQS({ region: "us-east-1" });

export const apiGateway = new awsx.apigateway.API("api", {
  routes: [
    {
      path: "/pdf",
      method: "POST",
      eventHandler: async (event) => {
        
        
        // Client passes email and content to add to PDF
        
        
        const { email, content } = JSON.parse(event.body || "{}");

       
        // Constructs message to send to SQS
        
        
        const sqsParams = {
          MessageBody: JSON.stringify({ email, content }),
          QueueUrl: Queues.pdfProcessingQueue.url.get(),
        };

        
        // Sends message to SQS
        
        
        const resp = await sqs.sendMessage(sqsParams).promise();
        const { MessageId } = resp;

        
        // Return message ID to client to allow Tracking 
        
        
        return { statusCode: 200, body: JSON.stringify({ MessageId }) };
      },
    },
  ],
  restApiArgs: {
    binaryMediaTypes: [],
  },
});
