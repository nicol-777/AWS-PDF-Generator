


import * as aws from "@pulumi/aws";
import { pdfProcessingLambda } from '../lambda';

const deadLetterQueue = new aws.sqs.Queue("deadLetterQueue", {
    name: "deadLetterQueue",
    visibilityTimeoutSeconds: 120, 

    //Visible for 2 minutes then timeout

    
    messageRetentionSeconds: 604800, 
  
  // Remove messages in DLQ after 7 Days

});

const pdfProcessingQueue = new aws.sqs.Queue("pdfProcessingQueue", {
    name: "pdfProcessingQueue",
    
    // Within 1 minute = Create PDF, Upload to S3, Send message, Delete message from queue
    
    visibilityTimeoutSeconds: 60,
    messageRetentionSeconds: 86400, 
  
    // Remove messages still in the queue after 24 hours
    
  fifoQueue: false,
    delaySeconds: 10, 
  
  // Delay message for 10 seconds to avoid possible Lambda limits.
  
  
  redrivePolicy: deadLetterQueue.arn.apply((arn) => JSON.stringify({
        deadLetterTargetArn: arn,
        maxReceiveCount: 3,
    }))
});

pdfProcessingQueue.onEvent("pdfProcessingQueueEvent", pdfProcessingLambda);

export const Queues = {
    deadLetterQueue,
    pdfProcessingQueue,
}
;
